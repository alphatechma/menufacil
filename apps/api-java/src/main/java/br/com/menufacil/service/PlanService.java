package br.com.menufacil.service;

import br.com.menufacil.converter.PlanConverter;
import br.com.menufacil.domain.models.Plan;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreatePlanRequest;
import br.com.menufacil.dto.PlanResponse;
import br.com.menufacil.repository.PlanRepository;
import br.com.menufacil.repository.SystemModuleRepository;
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

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlanService {

    private final PlanRepository planRepository;
    private final SystemModuleRepository systemModuleRepository;
    private final PlanConverter planConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<PlanResponse> findAll() {
        return planRepository.findAllByOrderByPriceAsc().stream()
                .map(planConverter::toResponse)
                .toList();
    }

    public PlanResponse findById(UUID id) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Plano não encontrado"));
        return planConverter.toResponse(plan);
    }

    @Transactional
    public PlanResponse create(CreatePlanRequest request) {
        Plan plan = planConverter.toEntity(request);
        plan = planRepository.save(plan);
        log.info("Plano criado: {} (preço={})", plan.getName(), plan.getPrice());

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("price", plan.getPrice());
        details.put("maxUsers", plan.getMaxUsers());
        details.put("maxProducts", plan.getMaxProducts());
        auditLogService.log(
                null,
                getCurrentUserId(),
                getCurrentUserEmail(),
                "create",
                "plan",
                plan.getId(),
                plan.getName(),
                serializeDetails(details),
                getCurrentIpAddress()
        );

        return planConverter.toResponse(plan);
    }

    @Transactional
    public PlanResponse update(UUID id, CreatePlanRequest request) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Plano não encontrado"));

        planConverter.updateFromRequest(request, plan);
        plan = planRepository.save(plan);
        log.info("Plano atualizado: {}", plan.getName());

        auditLogService.log(
                null,
                getCurrentUserId(),
                getCurrentUserEmail(),
                "update",
                "plan",
                plan.getId(),
                plan.getName(),
                null,
                getCurrentIpAddress()
        );

        return planConverter.toResponse(plan);
    }

    @Transactional
    public void delete(UUID id) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Plano não encontrado"));

        String planName = plan.getName();
        UUID planId = plan.getId();

        planRepository.delete(plan);
        log.info("Plano removido: {}", id);

        auditLogService.log(
                null,
                getCurrentUserId(),
                getCurrentUserEmail(),
                "delete",
                "plan",
                planId,
                planName,
                null,
                getCurrentIpAddress()
        );
    }

    @Transactional
    public PlanResponse assignModules(UUID planId, List<String> moduleIds) {
        Plan plan = planRepository.findById(planId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Plano não encontrado"));

        if (moduleIds == null || moduleIds.isEmpty()) {
            plan.setModules(new HashSet<>());
        } else {
            List<UUID> uuids = moduleIds.stream()
                    .map(this::parseUuid)
                    .collect(Collectors.toList());
            List<SystemModule> modules = systemModuleRepository.findAllById(uuids);
            if (modules.size() != uuids.size()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Um ou mais módulos informados não foram encontrados");
            }
            plan.setModules(new HashSet<>(modules));
        }

        plan = planRepository.save(plan);
        log.info("Módulos atualizados no plano {}: {} módulo(s)", planId, plan.getModules().size());

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("moduleCount", plan.getModules().size());
        auditLogService.log(
                null,
                getCurrentUserId(),
                getCurrentUserEmail(),
                "assign_modules",
                "plan",
                plan.getId(),
                plan.getName(),
                serializeDetails(details),
                getCurrentIpAddress()
        );

        return planConverter.toResponse(plan);
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Identificador de módulo inválido: " + value);
        }
    }

    private String serializeDetails(Map<String, Object> details) {
        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception ex) {
            return details != null ? details.toString() : null;
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
}
