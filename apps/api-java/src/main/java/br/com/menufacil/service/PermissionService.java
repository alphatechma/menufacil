package br.com.menufacil.service;

import br.com.menufacil.converter.PermissionConverter;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreatePermissionRequest;
import br.com.menufacil.dto.PermissionResponse;
import br.com.menufacil.repository.PermissionRepository;
import br.com.menufacil.repository.SystemModuleRepository;
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
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final SystemModuleRepository systemModuleRepository;
    private final PermissionConverter permissionConverter;

    public List<PermissionResponse> findAll(UUID moduleId) {
        List<Permission> permissions = moduleId != null
                ? permissionRepository.findByModuleIdOrderByKeyAsc(moduleId)
                : permissionRepository.findAllByOrderByKeyAsc();
        return permissions.stream()
                .map(permissionConverter::toResponse)
                .toList();
    }

    public PermissionResponse findById(UUID id) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Permissão não encontrada"));
        return permissionConverter.toResponse(permission);
    }

    @Transactional
    public PermissionResponse create(CreatePermissionRequest request) {
        if (permissionRepository.existsByKey(request.getKey())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Permissão com chave \"" + request.getKey() + "\" já existe");
        }

        Permission permission = permissionConverter.toEntity(request);
        if (request.getModuleId() != null) {
            SystemModule module = systemModuleRepository.findById(request.getModuleId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Módulo do sistema não encontrado"));
            permission.setModule(module);
        }

        permission = permissionRepository.save(permission);
        log.info("Permissão criada: {}", permission.getKey());
        return permissionConverter.toResponse(permission);
    }

    @Transactional
    public PermissionResponse update(UUID id, CreatePermissionRequest request) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Permissão não encontrada"));

        if (request.getKey() != null && !request.getKey().equals(permission.getKey())) {
            if (permissionRepository.existsByKey(request.getKey())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "Permissão com chave \"" + request.getKey() + "\" já existe");
            }
        }

        permissionConverter.updateFromRequest(request, permission);

        if (request.getModuleId() != null) {
            SystemModule module = systemModuleRepository.findById(request.getModuleId())
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Módulo do sistema não encontrado"));
            permission.setModule(module);
        }

        permission = permissionRepository.save(permission);
        log.info("Permissão atualizada: {}", permission.getKey());
        return permissionConverter.toResponse(permission);
    }

    @Transactional
    public void delete(UUID id) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Permissão não encontrada"));

        permissionRepository.delete(permission);
        log.info("Permissão removida: {}", id);
    }
}
