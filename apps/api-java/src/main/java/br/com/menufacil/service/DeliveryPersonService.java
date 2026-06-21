package br.com.menufacil.service;

import br.com.menufacil.converter.DeliveryPersonConverter;
import br.com.menufacil.domain.models.DeliveryPerson;
import br.com.menufacil.dto.CreateDeliveryPersonRequest;
import br.com.menufacil.dto.DeliveryPersonResponse;
import br.com.menufacil.repository.DeliveryPersonRepository;
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

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DeliveryPersonService {

    private final DeliveryPersonRepository deliveryPersonRepository;
    private final DeliveryPersonConverter deliveryPersonConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<DeliveryPersonResponse> findAllByTenant(UUID tenantId) {
        return deliveryPersonRepository.findByTenantId(tenantId).stream()
                .map(deliveryPersonConverter::toResponse)
                .toList();
    }

    public List<DeliveryPersonResponse> findActiveByTenant(UUID tenantId) {
        return deliveryPersonRepository.findByTenantIdAndIsActiveTrue(tenantId).stream()
                .map(deliveryPersonConverter::toResponse)
                .toList();
    }

    public DeliveryPersonResponse findById(UUID id, UUID tenantId) {
        DeliveryPerson entity = deliveryPersonRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Entregador não encontrado"));
        validateTenant(entity, tenantId);
        return deliveryPersonConverter.toResponse(entity);
    }

    @Transactional
    public DeliveryPersonResponse create(UUID tenantId, CreateDeliveryPersonRequest request) {
        DeliveryPerson entity = deliveryPersonConverter.toEntity(request);
        entity.setTenantId(tenantId);
        entity = deliveryPersonRepository.save(entity);
        log.info("Entregador criado: {} no tenant {}", entity.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("name", entity.getName());
            details.put("isActive", entity.isActive());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "delivery_person",
                    entity.getId(),
                    entity.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de delivery_person create: {}", e.getMessage());
        }

        return deliveryPersonConverter.toResponse(entity);
    }

    @Transactional
    public DeliveryPersonResponse update(UUID id, UUID tenantId, CreateDeliveryPersonRequest request) {
        DeliveryPerson entity = deliveryPersonRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Entregador não encontrado"));
        validateTenant(entity, tenantId);

        String oldName = entity.getName();
        boolean oldActive = entity.isActive();

        deliveryPersonConverter.updateFromRequest(request, entity);
        entity = deliveryPersonRepository.save(entity);
        log.info("Entregador atualizado: {} no tenant {}", entity.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldName", oldName);
            details.put("newName", entity.getName());
            details.put("oldActive", oldActive);
            details.put("newActive", entity.isActive());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "delivery_person",
                    entity.getId(),
                    entity.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de delivery_person update: {}", e.getMessage());
        }

        return deliveryPersonConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        DeliveryPerson entity = deliveryPersonRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Entregador não encontrado"));
        validateTenant(entity, tenantId);

        UUID entityId = entity.getId();
        UUID entityTenantId = entity.getTenantId();
        String entityName = entity.getName();

        deliveryPersonRepository.delete(entity);
        log.info("Entregador removido: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    entityTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "delivery_person",
                    entityId,
                    entityName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de delivery_person delete: {}", e.getMessage());
        }
    }

    private void validateTenant(DeliveryPerson entity, UUID tenantId) {
        if (!entity.getTenantId().equals(tenantId)) {
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
