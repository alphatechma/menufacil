package br.com.menufacil.service.whatsapp;

import br.com.menufacil.converter.WhatsappTemplateConverter;
import br.com.menufacil.domain.models.WhatsappMessageTemplate;
import br.com.menufacil.dto.CreateWhatsappTemplateRequest;
import br.com.menufacil.dto.WhatsappTemplateResponse;
import br.com.menufacil.repository.WhatsappMessageTemplateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
public class WhatsappTemplateService {

    private final WhatsappMessageTemplateRepository templateRepository;
    private final WhatsappTemplateConverter templateConverter;

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
        return templateConverter.toResponse(template);
    }

    @Transactional
    public WhatsappTemplateResponse update(UUID id, UUID tenantId, CreateWhatsappTemplateRequest request) {
        WhatsappMessageTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Template não encontrado"));

        validateTenant(template, tenantId);
        templateConverter.updateFromRequest(request, template);

        template = templateRepository.save(template);
        log.info("Template WhatsApp atualizado: {} no tenant {}", template.getName(), tenantId);
        return templateConverter.toResponse(template);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        WhatsappMessageTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Template não encontrado"));

        validateTenant(template, tenantId);
        templateRepository.delete(template);
        log.info("Template WhatsApp removido: {} no tenant {}", id, tenantId);
    }

    private void validateTenant(WhatsappMessageTemplate template, UUID tenantId) {
        if (!template.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
