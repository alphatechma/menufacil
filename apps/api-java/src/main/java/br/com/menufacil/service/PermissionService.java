package br.com.menufacil.service;

import br.com.menufacil.converter.PermissionConverter;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreatePermissionRequest;
import br.com.menufacil.dto.PermissionResponse;
import br.com.menufacil.config.security.UserPermissionsService;
import br.com.menufacil.repository.PermissionRepository;
import br.com.menufacil.repository.SystemModuleRepository;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final SystemModuleRepository systemModuleRepository;
    private final PermissionConverter permissionConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

        Map<String, Object> details = new HashMap<>();
        details.put("key", permission.getKey());
        details.put("name", permission.getName());
        details.put("moduleId", request.getModuleId() != null ? request.getModuleId().toString() : null);
        auditLogService.log(
                null,
                getCurrentUserId(),
                getCurrentUserEmail(),
                "create",
                "permission",
                permission.getId(),
                permission.getKey(),
                serializeDetails(details),
                getCurrentIpAddress()
        );

        return permissionConverter.toResponse(permission);
    }

    @Transactional
    @CacheEvict(value = UserPermissionsService.CACHE_NAME, allEntries = true)
    public PermissionResponse update(UUID id, CreatePermissionRequest request) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Permissão não encontrada"));

        String oldKey = permission.getKey();

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

        Map<String, Object> details = new HashMap<>();
        details.put("oldKey", oldKey);
        details.put("newKey", permission.getKey());
        details.put("name", permission.getName());
        details.put("moduleId", request.getModuleId() != null ? request.getModuleId().toString() : null);
        auditLogService.log(
                null,
                getCurrentUserId(),
                getCurrentUserEmail(),
                "update",
                "permission",
                permission.getId(),
                permission.getKey(),
                serializeDetails(details),
                getCurrentIpAddress()
        );

        return permissionConverter.toResponse(permission);
    }

    @Transactional
    @CacheEvict(value = UserPermissionsService.CACHE_NAME, allEntries = true)
    public void delete(UUID id) {
        Permission permission = permissionRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Permissão não encontrada"));

        UUID permissionId = permission.getId();
        String permissionKey = permission.getKey();

        permissionRepository.delete(permission);
        log.info("Permissão removida: {}", id);

        auditLogService.log(
                null,
                getCurrentUserId(),
                getCurrentUserEmail(),
                "delete",
                "permission",
                permissionId,
                permissionKey,
                null,
                getCurrentIpAddress()
        );
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
