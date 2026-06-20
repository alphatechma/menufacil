package br.com.menufacil.service;

import br.com.menufacil.converter.TenantUnitConverter;
import br.com.menufacil.domain.models.TenantUnit;
import br.com.menufacil.dto.CreateTenantUnitRequest;
import br.com.menufacil.dto.TenantUnitResponse;
import br.com.menufacil.repository.TenantUnitRepository;
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
public class TenantUnitService {

    private final TenantUnitRepository tenantUnitRepository;
    private final TenantUnitConverter tenantUnitConverter;

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
        return tenantUnitConverter.toResponse(unit);
    }

    @Transactional
    public TenantUnitResponse update(UUID id, UUID tenantId, CreateTenantUnitRequest request) {
        TenantUnit unit = tenantUnitRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Unidade não encontrada"));

        validateTenant(unit, tenantId);

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
    }

    private void validateTenant(TenantUnit unit, UUID tenantId) {
        if (!unit.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
