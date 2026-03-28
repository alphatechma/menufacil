package br.com.menufacil.service;

import br.com.menufacil.converter.TenantConverter;
import br.com.menufacil.domain.models.Tenant;
import br.com.menufacil.dto.TenantPublicResponse;
import br.com.menufacil.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TenantService {

    private final TenantRepository tenantRepository;
    private final TenantConverter tenantConverter;

    public TenantPublicResponse findBySlug(String slug) {
        Tenant tenant = tenantRepository.findBySlugAndIsActiveTrue(slug)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estabelecimento não encontrado"));

        log.info("Tenant consultado por slug: {}", slug);
        return tenantConverter.toPublicResponse(tenant);
    }

    public Tenant findById(UUID id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Estabelecimento não encontrado"));
    }
}
