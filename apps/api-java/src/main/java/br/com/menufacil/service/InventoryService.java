package br.com.menufacil.service;

import br.com.menufacil.converter.InventoryConverter;
import br.com.menufacil.domain.models.InventoryItem;
import br.com.menufacil.domain.models.StockMovement;
import br.com.menufacil.dto.*;
import br.com.menufacil.repository.InventoryItemRepository;
import br.com.menufacil.repository.StockMovementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InventoryService {

    private final InventoryItemRepository itemRepository;
    private final StockMovementRepository movementRepository;
    private final InventoryConverter inventoryConverter;

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
        return inventoryConverter.toItemResponse(item);
    }

    @Transactional
    public InventoryItemResponse update(UUID id, UUID tenantId, CreateInventoryItemRequest request) {
        InventoryItem item = itemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Item de estoque não encontrado"));
        validateItemTenant(item, tenantId);
        inventoryConverter.updateItemFromRequest(request, item);
        item = itemRepository.save(item);
        log.info("Item de estoque atualizado: {} no tenant {}", item.getName(), tenantId);
        return inventoryConverter.toItemResponse(item);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        InventoryItem item = itemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Item de estoque não encontrado"));
        validateItemTenant(item, tenantId);
        itemRepository.delete(item);
        log.info("Item de estoque removido: {} no tenant {}", id, tenantId);
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
}
