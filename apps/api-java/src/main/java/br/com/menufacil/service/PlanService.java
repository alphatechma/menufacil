package br.com.menufacil.service;

import br.com.menufacil.converter.PlanConverter;
import br.com.menufacil.domain.models.Plan;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreatePlanRequest;
import br.com.menufacil.dto.PlanResponse;
import br.com.menufacil.repository.PlanRepository;
import br.com.menufacil.repository.SystemModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
        return planConverter.toResponse(plan);
    }

    @Transactional
    public void delete(UUID id) {
        Plan plan = planRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Plano não encontrado"));

        planRepository.delete(plan);
        log.info("Plano removido: {}", id);
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
}
