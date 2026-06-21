package br.com.menufacil.service;

import br.com.menufacil.converter.TenantUnitConverter;
import br.com.menufacil.domain.models.TenantUnit;
import br.com.menufacil.dto.CreateTenantUnitRequest;
import br.com.menufacil.dto.TenantUnitResponse;
import br.com.menufacil.repository.TenantUnitRepository;
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
public class TenantUnitService {

    private final TenantUnitRepository tenantUnitRepository;
    private final TenantUnitConverter tenantUnitConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<TenantUnitResponse> findAllByTenant(UUID tenantId) {
        return tenantUnitRepository
                .findByTenantIdOrderByIsHeadquartersDescNameAsc(tenantId)
                .stream()
                .map(tenantUnitConverter::toResponse)
                .toList();
    }

    public List<TenantUnitResponse> findActiveByTenant(UUID tenantId) {
        return tenantUnitRepository
                .findByTenantIdAndIsActiveTrueOrderByIsHeadquartersDescNameAsc(tenantId)
                .stream()
                .map(tenantUnitConverter::toResponse)
                .toList();
    }

    public TenantUnitResponse findById(UUID id, UUID tenantId) {
        TenantUnit unit = tenantUnitRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Unidade não encontrada"));

        validateTenant(unit, tenantId);
        return tenantUnitConverter.toResponse(unit);
    }

    @Transactional
    public TenantUnitResponse create(UUID tenantId, CreateTenantUnitRequest request) {
        tenantUnitRepository.findByTenantIdAndSlug(tenantId, request.getSlug())
                .ifPresent(existing -> {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Slug já está em uso para este tenant");
                });

        TenantUnit unit = tenantUnitConverter.toEntity(request);
        unit.setTenantId(tenantId);

        long count = tenantUnitRepository.countByTenantId(tenantId);
        if (count == 0) {
            unit.setHeadquarters(true);
            log.info("Primeira unidade do tenant {} — definida como matriz", tenantId);
        }

        unit = tenantUnitRepository.save(unit);
        log.info("Unidade criada: {} (slug={}) no tenant {}", unit.getName(), unit.getSlug(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("name", unit.getName());
            details.put("slug", unit.getSlug());
            details.put("isHeadquarters", unit.isHeadquarters());
            details.put("isActive", unit.isActive());
            auditLogService.log(
                    unit.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "tenant_unit",
                    unit.getId(),
                    unit.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de tenant_unit create: {}", e.getMessage());
        }

        return tenantUnitConverter.toResponse(unit);
    }

    @Transactional
    public TenantUnitResponse update(UUID id, UUID tenantId, CreateTenantUnitRequest request) {
        TenantUnit unit = tenantUnitRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Unidade não encontrada"));

        validateTenant(unit, tenantId);

        String oldName = unit.getName();
        String oldSlug = unit.getSlug();

        if (request.getSlug() != null && !request.getSlug().equals(unit.getSlug())) {
            tenantUnitRepository.findByTenantIdAndSlug(tenantId, request.getSlug())
                    .ifPresent(existing -> {
                        throw new ResponseStatusException(
                                HttpStatus.BAD_REQUEST,
                                "Slug já está em uso para este tenant");
                    });
            unit.setSlug(request.getSlug());
        }

        tenantUnitConverter.updateFromRequest(request, unit);

        unit = tenantUnitRepository.save(unit);
        log.info("Unidade atualizada: {} no tenant {}", unit.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldName", oldName);
            details.put("newName", unit.getName());
            details.put("oldSlug", oldSlug);
            details.put("newSlug", unit.getSlug());
            auditLogService.log(
                    unit.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "tenant_unit",
                    unit.getId(),
                    unit.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de tenant_unit update: {}", e.getMessage());
        }

        return tenantUnitConverter.toResponse(unit);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        TenantUnit unit = tenantUnitRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Unidade não encontrada"));

        validateTenant(unit, tenantId);
        unit.setActive(false);
        tenantUnitRepository.save(unit);
        log.info("Unidade desativada (soft delete): {} no tenant {}", id, tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("softDelete", true);
            details.put("isActive", unit.isActive());
            auditLogService.log(
                    unit.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "tenant_unit",
                    unit.getId(),
                    unit.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de tenant_unit delete: {}", e.getMessage());
        }
    }

    private void validateTenant(TenantUnit unit, UUID tenantId) {
        if (!unit.getTenantId().equals(tenantId)) {
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
