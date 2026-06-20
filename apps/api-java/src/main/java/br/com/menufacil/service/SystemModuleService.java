package br.com.menufacil.service;

import br.com.menufacil.converter.SystemModuleConverter;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreateSystemModuleRequest;
import br.com.menufacil.dto.SystemModuleResponse;
import br.com.menufacil.repository.SystemModuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
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
public class SystemModuleService {

    private final SystemModuleRepository systemModuleRepository;
    private final SystemModuleConverter systemModuleConverter;

    @Cacheable("systemModules")
    public List<SystemModuleResponse> findAll() {
        return systemModuleRepository.findAllByOrderByNameAsc().stream()
                .map(systemModuleConverter::toResponse)
                .toList();
    }

    public SystemModuleResponse findById(UUID id) {
        SystemModule module = systemModuleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Módulo do sistema não encontrado"));
        return systemModuleConverter.toResponse(module);
    }

    @Transactional
    @CacheEvict(value = "systemModules", allEntries = true)
    public SystemModuleResponse create(CreateSystemModuleRequest request) {
        if (systemModuleRepository.existsByKey(request.getKey())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Módulo com chave \"" + request.getKey() + "\" já existe");
        }

        SystemModule module = systemModuleConverter.toEntity(request);
        module = systemModuleRepository.save(module);
        log.info("Módulo de sistema criado: {}", module.getKey());
        return systemModuleConverter.toResponse(module);
    }

    @Transactional
    @CacheEvict(value = "systemModules", allEntries = true)
    public SystemModuleResponse update(UUID id, CreateSystemModuleRequest request) {
        SystemModule module = systemModuleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Módulo do sistema não encontrado"));

        if (request.getKey() != null && !request.getKey().equals(module.getKey())) {
            if (systemModuleRepository.existsByKey(request.getKey())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Módulo com chave \"" + request.getKey() + "\" já existe");
            }
        }

        systemModuleConverter.updateFromRequest(request, module);
        module = systemModuleRepository.save(module);
        log.info("Módulo de sistema atualizado: {}", module.getKey());
        return systemModuleConverter.toResponse(module);
    }

    @Transactional
    @CacheEvict(value = "systemModules", allEntries = true)
    public void delete(UUID id) {
        SystemModule module = systemModuleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Módulo do sistema não encontrado"));

        systemModuleRepository.delete(module);
        log.info("Módulo de sistema removido: {}", id);
    }
}
