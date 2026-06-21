package br.com.menufacil.service;

import br.com.menufacil.converter.PermissionConverter;
import br.com.menufacil.converter.RoleConverter;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.Role;
import br.com.menufacil.dto.CreateRoleRequest;
import br.com.menufacil.dto.PermissionResponse;
import br.com.menufacil.dto.RoleResponse;
import br.com.menufacil.config.security.UserPermissionsService;
import br.com.menufacil.repository.PermissionRepository;
import br.com.menufacil.repository.RoleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
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
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

        Map<String, Object> details = new HashMap<>();
        details.put("permissionCount", role.getPermissions() != null ? role.getPermissions().size() : 0);
        details.put("isSystemDefault", role.isSystemDefault());
        auditLogService.log(
                role.getTenantId(),
                getCurrentUserId(),
                getCurrentUserEmail(),
                "create",
                "role",
                role.getId(),
                role.getName(),
                serializeDetails(details),
                getCurrentIpAddress()
        );

        return roleConverter.toResponse(role);
    }

    @Transactional
    @CacheEvict(value = UserPermissionsService.CACHE_NAME, allEntries = true)
    public RoleResponse update(UUID id, UUID tenantId, CreateRoleRequest request) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cargo não encontrado"));

        validateTenant(role, tenantId);
        validateNotSystemDefault(role, "editado");

        String oldName = role.getName();

        roleConverter.updateFromRequest(request, role);
        if (request.getPermissionIds() != null) {
            role.setPermissions(resolvePermissions(request.getPermissionIds()));
        }

        role = roleRepository.save(role);
        log.info("Cargo atualizado: {} no tenant {}", role.getName(), tenantId);

        Map<String, Object> details = new HashMap<>();
        details.put("oldName", oldName);
        details.put("newName", role.getName());
        details.put("permissionCount", role.getPermissions() != null ? role.getPermissions().size() : 0);
        auditLogService.log(
                role.getTenantId(),
                getCurrentUserId(),
                getCurrentUserEmail(),
                "update",
                "role",
                role.getId(),
                role.getName(),
                serializeDetails(details),
                getCurrentIpAddress()
        );

        return roleConverter.toResponse(role);
    }

    @Transactional
    @CacheEvict(value = UserPermissionsService.CACHE_NAME, allEntries = true)
    public void delete(UUID id, UUID tenantId) {
        Role role = roleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cargo não encontrado"));

        validateTenant(role, tenantId);
        validateNotSystemDefault(role, "removido");

        UUID roleId = role.getId();
        String roleName = role.getName();
        UUID roleTenantId = role.getTenantId();

        roleRepository.delete(role);
        log.info("Cargo removido: {} no tenant {}", id, tenantId);

        auditLogService.log(
                roleTenantId,
                getCurrentUserId(),
                getCurrentUserEmail(),
                "delete",
                "role",
                roleId,
                roleName,
                null,
                getCurrentIpAddress()
        );
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
