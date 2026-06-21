package br.com.menufacil.service.whatsapp;

import br.com.menufacil.converter.WhatsappTemplateConverter;
import br.com.menufacil.domain.models.WhatsappMessageTemplate;
import br.com.menufacil.dto.CreateWhatsappTemplateRequest;
import br.com.menufacil.dto.WhatsappTemplateResponse;
import br.com.menufacil.repository.WhatsappMessageTemplateRepository;
import br.com.menufacil.service.AuditLogService;
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
public class WhatsappTemplateService {

    private final WhatsappMessageTemplateRepository templateRepository;
    private final WhatsappTemplateConverter templateConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<WhatsappTemplateResponse> listByTenant(UUID tenantId) {
        return templateRepository.findByTenantIdOrderByNameAsc(tenantId).stream()
                .map(templateConverter::toResponse)
                .toList();
    }

    public WhatsappTemplateResponse getById(UUID id, UUID tenantId) {
        WhatsappMessageTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Template não encontrado"));

        validateTenant(template, tenantId);
        return templateConverter.toResponse(template);
    }

    @Transactional
    public WhatsappTemplateResponse create(UUID tenantId, CreateWhatsappTemplateRequest request) {
        WhatsappMessageTemplate template = templateConverter.toEntity(request);
        template.setTenantId(tenantId);

        template = templateRepository.save(template);
        log.info("Template WhatsApp criado: {} no tenant {}", template.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("name", template.getName());
            details.put("hasVariables", template.getVariables() != null && !template.getVariables().isBlank());
            auditLogService.log(
                    template.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "whatsapp_template",
                    template.getId(),
                    template.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de create WhatsApp template: {}", e.getMessage());
        }

        return templateConverter.toResponse(template);
    }

    @Transactional
    public WhatsappTemplateResponse update(UUID id, UUID tenantId, CreateWhatsappTemplateRequest request) {
        WhatsappMessageTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Template não encontrado"));

        validateTenant(template, tenantId);

        String oldName = template.getName();

        templateConverter.updateFromRequest(request, template);

        template = templateRepository.save(template);
        log.info("Template WhatsApp atualizado: {} no tenant {}", template.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldName", oldName);
            details.put("newName", template.getName());
            details.put("hasVariables", template.getVariables() != null && !template.getVariables().isBlank());
            auditLogService.log(
                    template.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "whatsapp_template",
                    template.getId(),
                    template.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de update WhatsApp template: {}", e.getMessage());
        }

        return templateConverter.toResponse(template);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        WhatsappMessageTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Template não encontrado"));

        validateTenant(template, tenantId);

        UUID templateId = template.getId();
        String templateName = template.getName();
        UUID templateTenantId = template.getTenantId();

        templateRepository.delete(template);
        log.info("Template WhatsApp removido: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    templateTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "whatsapp_template",
                    templateId,
                    templateName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de delete WhatsApp template: {}", e.getMessage());
        }
    }

    private void validateTenant(WhatsappMessageTemplate template, UUID tenantId) {
        if (!template.getTenantId().equals(tenantId)) {
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
