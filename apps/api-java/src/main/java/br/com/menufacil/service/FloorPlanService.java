package br.com.menufacil.service;

import br.com.menufacil.converter.FloorPlanConverter;
import br.com.menufacil.domain.models.FloorPlan;
import br.com.menufacil.dto.CreateFloorPlanRequest;
import br.com.menufacil.dto.FloorPlanResponse;
import br.com.menufacil.repository.FloorPlanRepository;
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
public class FloorPlanService {

    private final FloorPlanRepository floorPlanRepository;
    private final FloorPlanConverter floorPlanConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<FloorPlanResponse> findByTenant(UUID tenantId, UUID unitId) {
        List<FloorPlan> plans = unitId != null
                ? floorPlanRepository.findByTenantIdAndUnitIdOrderByCreatedAtAsc(tenantId, unitId)
                : floorPlanRepository.findByTenantIdOrderByCreatedAtAsc(tenantId);
        return plans.stream()
                .map(floorPlanConverter::toResponse)
                .toList();
    }

    public FloorPlanResponse findById(UUID id, UUID tenantId) {
        FloorPlan plan = floorPlanRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mapa do salão não encontrado"));
        validateTenant(plan, tenantId);
        return floorPlanConverter.toResponse(plan);
    }

    @Transactional
    public FloorPlanResponse create(UUID tenantId, CreateFloorPlanRequest request) {
        FloorPlan plan = floorPlanConverter.toEntity(request);
        plan.setTenantId(tenantId);

        plan = floorPlanRepository.save(plan);
        log.info("Mapa do salão criado: {} no tenant {}", plan.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("name", plan.getName());
            auditLogService.log(
                    plan.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "floor_plan",
                    plan.getId(),
                    plan.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de floor_plan create: {}", e.getMessage());
        }

        return floorPlanConverter.toResponse(plan);
    }

    @Transactional
    public FloorPlanResponse update(UUID id, UUID tenantId, CreateFloorPlanRequest request) {
        FloorPlan plan = floorPlanRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mapa do salão não encontrado"));

        validateTenant(plan, tenantId);

        String oldName = plan.getName();

        floorPlanConverter.updateFromRequest(request, plan);

        plan = floorPlanRepository.save(plan);
        log.info("Mapa do salão atualizado: {} no tenant {}", plan.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldName", oldName);
            details.put("newName", plan.getName());
            auditLogService.log(
                    plan.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "floor_plan",
                    plan.getId(),
                    plan.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de floor_plan update: {}", e.getMessage());
        }

        return floorPlanConverter.toResponse(plan);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        FloorPlan plan = floorPlanRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mapa do salão não encontrado"));

        validateTenant(plan, tenantId);

        UUID planId = plan.getId();
        UUID planTenantId = plan.getTenantId();
        String planName = plan.getName();

        floorPlanRepository.delete(plan);
        log.info("Mapa do salão removido: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    planTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "floor_plan",
                    planId,
                    planName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de floor_plan delete: {}", e.getMessage());
        }
    }

    private void validateTenant(FloorPlan plan, UUID tenantId) {
        if (!plan.getTenantId().equals(tenantId)) {
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
