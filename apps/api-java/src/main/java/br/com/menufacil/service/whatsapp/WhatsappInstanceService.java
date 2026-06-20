package br.com.menufacil.service.whatsapp;

import br.com.menufacil.converter.WhatsappInstanceConverter;
import br.com.menufacil.domain.enums.WhatsappInstanceStatus;
import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.dto.ConnectInstanceRequest;
import br.com.menufacil.dto.WhatsappInstanceResponse;
import br.com.menufacil.repository.WhatsappInstanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WhatsappInstanceService {

    private final WhatsappInstanceRepository instanceRepository;
    private final WhatsappInstanceConverter instanceConverter;
    private final EvolutionApiService evolutionApiService;

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
}
