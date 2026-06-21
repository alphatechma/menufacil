package br.com.menufacil.service.whatsapp;

import br.com.menufacil.converter.WhatsappInstanceConverter;
import br.com.menufacil.domain.enums.WhatsappInstanceStatus;
import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.dto.ConnectInstanceRequest;
import br.com.menufacil.dto.WhatsappInstanceResponse;
import br.com.menufacil.repository.WhatsappInstanceRepository;
import br.com.menufacil.service.AuditLogService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
public class WhatsappInstanceService {

    private final WhatsappInstanceRepository instanceRepository;
    private final WhatsappInstanceConverter instanceConverter;
    private final EvolutionApiService evolutionApiService;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${evolution.webhook.url:}")
    private String webhookUrl;

    public List<WhatsappInstanceResponse> listByTenant(UUID tenantId) {
        return instanceRepository.findByTenantId(tenantId).stream()
                .map(instanceConverter::toResponse)
                .toList();
    }

    @Transactional
    public WhatsappInstanceResponse getStatus(UUID tenantId, String instanceName) {
        WhatsappInstance instance = findByName(instanceName);
        validateTenant(instance, tenantId);

        try {
            EvolutionApiService.InstanceStatusResponse remote =
                    evolutionApiService.getInstanceStatus(instanceName);
            applyRemoteStatus(instance, remote);
            instance = instanceRepository.saveAndFlush(instance);
        } catch (ResponseStatusException e) {
            log.warn("Não foi possível atualizar status da instância {}: {}",
                    instanceName, e.getReason());
        }

        return instanceConverter.toResponse(instance);
    }

    @Transactional
    public WhatsappInstanceResponse connect(UUID tenantId, ConnectInstanceRequest request) {
        WhatsappInstance instance = instanceRepository
                .findByInstanceName(request.getInstanceName())
                .orElse(null);

        if (instance == null) {
            instance = new WhatsappInstance();
            instance.setTenantId(tenantId);
            instance.setInstanceName(request.getInstanceName());
            instance.setStatus(WhatsappInstanceStatus.connecting);
            if (request.getUnitId() != null && !request.getUnitId().isBlank()) {
                instance.setUnitId(UUID.fromString(request.getUnitId()));
            }
        } else {
            validateTenant(instance, tenantId);
            if (instance.getStatus() == WhatsappInstanceStatus.connected) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "WhatsApp já está conectado");
            }
            instance.setStatus(WhatsappInstanceStatus.connecting);
        }

        try {
            evolutionApiService.createInstance(request.getInstanceName(), webhookUrl);
        } catch (ResponseStatusException e) {
            log.warn("createInstance falhou (pode já existir): {}", e.getReason());
        }

        EvolutionApiService.InstanceStatusResponse connectResult =
                evolutionApiService.connectInstance(request.getInstanceName());

        instance.setQrCode(connectResult.qrCode());
        instance.setStatus(WhatsappInstanceStatus.connecting);

        instance = instanceRepository.save(instance);
        log.info("Instância WhatsApp '{}' em conexão no tenant {}",
                instance.getInstanceName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("instanceName", instance.getInstanceName());
            details.put("status", instance.getStatus() != null ? instance.getStatus().name() : null);
            details.put("unitId", instance.getUnitId() != null ? instance.getUnitId().toString() : null);
            auditLogService.log(
                    instance.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "connect",
                    "whatsapp_instance",
                    instance.getId(),
                    instance.getInstanceName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de connect WhatsApp instance: {}", e.getMessage());
        }

        return instanceConverter.toResponse(instance);
    }

    @Transactional
    public WhatsappInstanceResponse disconnect(UUID tenantId, String instanceName) {
        WhatsappInstance instance = findByName(instanceName);
        validateTenant(instance, tenantId);

        try {
            evolutionApiService.disconnectInstance(instanceName);
        } catch (ResponseStatusException e) {
            log.warn("disconnectInstance falhou (continuando): {}", e.getReason());
        }

        instance.setStatus(WhatsappInstanceStatus.disconnected);
        instance.setPhoneNumber(null);
        instance.setQrCode(null);

        instance = instanceRepository.save(instance);
        log.info("Instância WhatsApp '{}' desconectada no tenant {}",
                instanceName, tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("instanceName", instance.getInstanceName());
            details.put("status", instance.getStatus().name());
            auditLogService.log(
                    instance.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "disconnect",
                    "whatsapp_instance",
                    instance.getId(),
                    instance.getInstanceName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de disconnect WhatsApp instance: {}", e.getMessage());
        }

        return instanceConverter.toResponse(instance);
    }

    private WhatsappInstance findByName(String instanceName) {
        return instanceRepository.findByInstanceName(instanceName)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Instância WhatsApp não encontrada"));
    }

    private void validateTenant(WhatsappInstance instance, UUID tenantId) {
        if (instance.getTenantId() == null || !instance.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Acesso negado a este recurso");
        }
    }

    private void applyRemoteStatus(WhatsappInstance instance,
                                   EvolutionApiService.InstanceStatusResponse remote) {
        if (remote == null) return;
        String state = remote.status();
        if ("open".equalsIgnoreCase(state)) {
            instance.setStatus(WhatsappInstanceStatus.connected);
            if (remote.phoneNumber() != null) {
                instance.setPhoneNumber(remote.phoneNumber());
            }
        } else if ("close".equalsIgnoreCase(state) || "closed".equalsIgnoreCase(state)) {
            instance.setStatus(WhatsappInstanceStatus.disconnected);
        } else if ("connecting".equalsIgnoreCase(state)) {
            instance.setStatus(WhatsappInstanceStatus.connecting);
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
