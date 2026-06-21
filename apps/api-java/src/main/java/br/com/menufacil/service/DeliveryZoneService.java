package br.com.menufacil.service;

import br.com.menufacil.converter.DeliveryZoneConverter;
import br.com.menufacil.domain.models.DeliveryZone;
import br.com.menufacil.dto.CreateDeliveryZoneRequest;
import br.com.menufacil.dto.DeliveryZoneResponse;
import br.com.menufacil.repository.DeliveryZoneRepository;
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
public class DeliveryZoneService {

    private final DeliveryZoneRepository deliveryZoneRepository;
    private final DeliveryZoneConverter deliveryZoneConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<DeliveryZoneResponse> findAllByTenant(UUID tenantId) {
        return deliveryZoneRepository.findByTenantId(tenantId).stream()
                .map(deliveryZoneConverter::toResponse)
                .toList();
    }

    public DeliveryZoneResponse findById(UUID id, UUID tenantId) {
        DeliveryZone entity = deliveryZoneRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Zona de entrega não encontrada"));
        validateTenant(entity, tenantId);
        return deliveryZoneConverter.toResponse(entity);
    }

    @Transactional
    public DeliveryZoneResponse create(UUID tenantId, CreateDeliveryZoneRequest request) {
        DeliveryZone entity = deliveryZoneConverter.toEntity(request);
        entity.setTenantId(tenantId);
        entity = deliveryZoneRepository.save(entity);
        log.info("Zona de entrega criada: {} no tenant {}", entity.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("name", entity.getName());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "delivery_zone",
                    entity.getId(),
                    entity.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de delivery_zone create: {}", e.getMessage());
        }

        return deliveryZoneConverter.toResponse(entity);
    }

    @Transactional
    public DeliveryZoneResponse update(UUID id, UUID tenantId, CreateDeliveryZoneRequest request) {
        DeliveryZone entity = deliveryZoneRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Zona de entrega não encontrada"));
        validateTenant(entity, tenantId);

        String oldName = entity.getName();

        deliveryZoneConverter.updateFromRequest(request, entity);
        entity = deliveryZoneRepository.save(entity);
        log.info("Zona de entrega atualizada: {} no tenant {}", entity.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldName", oldName);
            details.put("newName", entity.getName());
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "delivery_zone",
                    entity.getId(),
                    entity.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de delivery_zone update: {}", e.getMessage());
        }

        return deliveryZoneConverter.toResponse(entity);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        DeliveryZone entity = deliveryZoneRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Zona de entrega não encontrada"));
        validateTenant(entity, tenantId);

        UUID entityId = entity.getId();
        UUID entityTenantId = entity.getTenantId();
        String entityName = entity.getName();

        deliveryZoneRepository.delete(entity);
        log.info("Zona de entrega removida: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    entityTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "delivery_zone",
                    entityId,
                    entityName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de delivery_zone delete: {}", e.getMessage());
        }
    }

    private void validateTenant(DeliveryZone entity, UUID tenantId) {
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
