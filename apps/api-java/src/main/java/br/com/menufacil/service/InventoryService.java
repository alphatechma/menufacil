package br.com.menufacil.service;

import br.com.menufacil.converter.InventoryConverter;
import br.com.menufacil.domain.models.InventoryItem;
import br.com.menufacil.domain.models.StockMovement;
import br.com.menufacil.dto.*;
import br.com.menufacil.repository.InventoryItemRepository;
import br.com.menufacil.repository.StockMovementRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryService {

    private final InventoryItemRepository itemRepository;
    private final StockMovementRepository movementRepository;
    private final InventoryConverter inventoryConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ---- Items CRUD ----

    public List<InventoryItemResponse> findAllByTenant(UUID tenantId) {
        return itemRepository.findByTenantId(tenantId).stream()
                .map(inventoryConverter::toItemResponse)
                .toList();
    }

    public InventoryItemResponse findById(UUID id, UUID tenantId) {
        InventoryItem item = itemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Item de estoque não encontrado"));
        validateItemTenant(item, tenantId);
        return inventoryConverter.toItemResponse(item);
    }

    @Transactional
    public InventoryItemResponse create(UUID tenantId, CreateInventoryItemRequest request) {
        InventoryItem item = inventoryConverter.toItemEntity(request);
        item.setTenantId(tenantId);
        item = itemRepository.save(item);
        log.info("Item de estoque criado: {} no tenant {}", item.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("name", item.getName());
            details.put("quantity", item.getQuantity() != null ? item.getQuantity().toPlainString() : null);
            auditLogService.log(
                    item.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "inventory_item",
                    item.getId(),
                    item.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de criação de item de estoque: {}", e.getMessage());
        }

        return inventoryConverter.toItemResponse(item);
    }

    @Transactional
    public InventoryItemResponse update(UUID id, UUID tenantId, CreateInventoryItemRequest request) {
        InventoryItem item = itemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Item de estoque não encontrado"));
        validateItemTenant(item, tenantId);

        String oldName = item.getName();
        BigDecimal oldQuantity = item.getQuantity();

        inventoryConverter.updateItemFromRequest(request, item);
        item = itemRepository.save(item);
        log.info("Item de estoque atualizado: {} no tenant {}", item.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldName", oldName);
            details.put("newName", item.getName());
            details.put("oldQuantity", oldQuantity != null ? oldQuantity.toPlainString() : null);
            details.put("newQuantity", item.getQuantity() != null ? item.getQuantity().toPlainString() : null);
            auditLogService.log(
                    item.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "inventory_item",
                    item.getId(),
                    item.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de atualização de item de estoque: {}", e.getMessage());
        }

        return inventoryConverter.toItemResponse(item);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        InventoryItem item = itemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Item de estoque não encontrado"));
        validateItemTenant(item, tenantId);

        UUID itemId = item.getId();
        UUID itemTenantId = item.getTenantId();
        String itemName = item.getName();

        itemRepository.delete(item);
        log.info("Item de estoque removido: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    itemTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "inventory_item",
                    itemId,
                    itemName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de remoção de item de estoque: {}", e.getMessage());
        }
    }

    // ---- Low Stock ----

    public List<InventoryItemResponse> getLowStockItems(UUID tenantId) {
        return itemRepository.findLowStockByTenantId(tenantId).stream()
                .map(inventoryConverter::toItemResponse)
                .toList();
    }

    // ---- Movements ----

    @Transactional
    public StockMovementResponse createMovement(UUID tenantId, CreateStockMovementRequest request) {
        UUID itemId = UUID.fromString(request.getInventoryItemId());

        InventoryItem item = itemRepository.findById(itemId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Item de estoque não encontrado"));
        validateItemTenant(item, tenantId);

        BigDecimal quantityBefore = item.getQuantity();

        // Atualizar quantidade do item baseado no tipo de movimentação
        BigDecimal qty = request.getQuantity();
        switch (request.getType()) {
            case "entry":
                item.setQuantity(item.getQuantity().add(qty));
                break;
            case "exit":
            case "production":
                if (item.getQuantity().compareTo(qty) < 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Quantidade insuficiente em estoque");
                }
                item.setQuantity(item.getQuantity().subtract(qty));
                break;
            case "adjustment":
                item.setQuantity(qty);
                break;
            default:
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Tipo de movimentação inválido: " + request.getType());
        }
        itemRepository.save(item);

        StockMovement movement = inventoryConverter.toMovementEntity(request);
        movement.setTenantId(tenantId);
        movement = movementRepository.save(movement);

        log.info("Movimentação de estoque: tipo={}, item={}, qty={}, tenant={}",
                request.getType(), itemId, qty, tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("inventoryItemId", itemId.toString());
            details.put("itemName", item.getName());
            details.put("type", request.getType());
            details.put("quantity", qty != null ? qty.toPlainString() : null);
            details.put("quantityBefore", quantityBefore != null ? quantityBefore.toPlainString() : null);
            details.put("quantityAfter", item.getQuantity() != null ? item.getQuantity().toPlainString() : null);
            auditLogService.log(
                    movement.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "movement",
                    "inventory_movement",
                    movement.getId(),
                    item.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de movimentação de estoque: {}", e.getMessage());
        }

        return inventoryConverter.toMovementResponse(movement);
    }

    @Transactional
    public void autoDeductStock(UUID orderId, UUID tenantId) {
        // TODO: Implementar dedução automática de estoque baseado nos itens do pedido
        // Requer mapeamento product -> inventory_item
        log.info("Auto-dedução de estoque para pedido {} no tenant {} (não implementado)", orderId, tenantId);
    }

    private void validateItemTenant(InventoryItem item, UUID tenantId) {
        if (!item.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object details = auth.getDetails();
        if (details instanceof Claims claims) {
            String userId = claims.get("userId", String.class);
            if (userId != null && !userId.isBlank()) {
                try { return UUID.fromString(userId); } catch (IllegalArgumentException ignored) {}
            }
        }
        return null;
    }

    private String getCurrentIpAddress() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String forwarded = req.getHeader("X-Forwarded-For");
                if (forwarded != null && !forwarded.isBlank()) {
                    return forwarded.split(",")[0].trim();
                }
                return req.getRemoteAddr();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String serializeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception e) {
            return details.toString();
        }
    }
}
