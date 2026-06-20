package br.com.menufacil.service;

import br.com.menufacil.converter.FloorPlanConverter;
import br.com.menufacil.domain.models.FloorPlan;
import br.com.menufacil.dto.CreateFloorPlanRequest;
import br.com.menufacil.dto.FloorPlanResponse;
import br.com.menufacil.repository.FloorPlanRepository;
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
public class FloorPlanService {

    private final FloorPlanRepository floorPlanRepository;
    private final FloorPlanConverter floorPlanConverter;

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
        return floorPlanConverter.toResponse(plan);
    }

    @Transactional
    public FloorPlanResponse update(UUID id, UUID tenantId, CreateFloorPlanRequest request) {
        FloorPlan plan = floorPlanRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mapa do salão não encontrado"));

        validateTenant(plan, tenantId);
        floorPlanConverter.updateFromRequest(request, plan);

        plan = floorPlanRepository.save(plan);
        log.info("Mapa do salão atualizado: {} no tenant {}", plan.getName(), tenantId);
        return floorPlanConverter.toResponse(plan);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        FloorPlan plan = floorPlanRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Mapa do salão não encontrado"));

        validateTenant(plan, tenantId);
        floorPlanRepository.delete(plan);
        log.info("Mapa do salão removido: {} no tenant {}", id, tenantId);
    }

    private void validateTenant(FloorPlan plan, UUID tenantId) {
        if (!plan.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
