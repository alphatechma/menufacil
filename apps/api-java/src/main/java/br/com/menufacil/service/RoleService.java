package br.com.menufacil.service;

import br.com.menufacil.converter.PermissionConverter;
import br.com.menufacil.converter.RoleConverter;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.Role;
import br.com.menufacil.dto.CreateRoleRequest;
import br.com.menufacil.dto.PermissionResponse;
import br.com.menufacil.dto.RoleResponse;
import br.com.menufacil.repository.PermissionRepository;
import br.com.menufacil.repository.RoleRepository;
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
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;
    private final RoleConverter roleConverter;
    private final PermissionConverter permissionConverter;

    public List<RoleResponse> findAllByTenant(UUID tenantId) {
        return roleRepository.findByTenantIdOrderByNameAsc(tenantId).stream()
                .map(roleConverter::toResponse)
                .toList();
    }

    public RoleResponse findById(UUID id, UUID tenantId) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cargo não encontrado"));

        validateTenant(role, tenantId);
        return roleConverter.toResponse(role);
    }

    public List<PermissionResponse> findAllPermissions() {
        return permissionRepository.findAllByOrderByKeyAsc().stream()
                .map(permissionConverter::toResponse)
                .toList();
    }

    @Transactional
    public RoleResponse create(UUID tenantId, CreateRoleRequest request) {
        Role role = roleConverter.toEntity(request);
        role.setTenantId(tenantId);
        role.setPermissions(resolvePermissions(request.getPermissionIds()));

        role = roleRepository.save(role);
        log.info("Cargo criado: {} no tenant {}", role.getName(), tenantId);
        return roleConverter.toResponse(role);
    }

    @Transactional
    public RoleResponse update(UUID id, UUID tenantId, CreateRoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cargo não encontrado"));

        validateTenant(role, tenantId);
        validateNotSystemDefault(role, "editado");

        roleConverter.updateFromRequest(request, role);
        if (request.getPermissionIds() != null) {
            role.setPermissions(resolvePermissions(request.getPermissionIds()));
        }

        role = roleRepository.save(role);
        log.info("Cargo atualizado: {} no tenant {}", role.getName(), tenantId);
        return roleConverter.toResponse(role);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cargo não encontrado"));

        validateTenant(role, tenantId);
        validateNotSystemDefault(role, "removido");

        roleRepository.delete(role);
        log.info("Cargo removido: {} no tenant {}", id, tenantId);
    }

    private Set<Permission> resolvePermissions(List<String> permissionIds) {
        if (permissionIds == null || permissionIds.isEmpty()) {
            return new HashSet<>();
        }

        List<UUID> uuids = permissionIds.stream()
                .map(this::parseUuid)
                .collect(Collectors.toList());

        List<Permission> found = permissionRepository.findAllById(uuids);
        if (found.size() != uuids.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Uma ou mais permissões informadas não foram encontradas");
        }
        return new HashSet<>(found);
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "ID de permissão inválido: " + value);
        }
    }

    private void validateTenant(Role role, UUID tenantId) {
        if (role.getTenantId() == null || !role.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }

    private void validateNotSystemDefault(Role role, String acao) {
        if (role.isSystemDefault()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Cargo padrão do sistema não pode ser " + acao);
        }
    }
}
