package br.com.menufacil.service;

import br.com.menufacil.converter.UserConverter;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.dto.ChangePasswordRequest;
import br.com.menufacil.dto.CreateUserRequest;
import br.com.menufacil.dto.UpdateUserRequest;
import br.com.menufacil.dto.UserResponse;
import br.com.menufacil.config.security.UserPermissionsService;
import br.com.menufacil.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final UserConverter userConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<UserResponse> findAllByTenant(UUID tenantId) {
        return userRepository.findByTenantIdOrderByNameAsc(tenantId).stream()
                .map(userConverter::toResponse)
                .toList();
    }

    public UserResponse findById(UUID id, UUID tenantId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        validateTenant(user, tenantId);
        return userConverter.toResponse(user);
    }

    public UserResponse findCurrentUser(UUID tenantId) {
        String email = resolveCurrentUserEmail();
        User user = userRepository.findByEmailAndTenantId(email, tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário autenticado não encontrado"));
        return userConverter.toResponse(user);
    }

    @Transactional
    public UserResponse create(UUID tenantId, CreateUserRequest request) {
        if (userRepository.existsByEmailAndTenantId(request.getEmail(), tenantId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "E-mail já está em uso neste tenant");
        }

        User user = userConverter.toEntity(request);
        user.setTenantId(tenantId);
        user.setPasswordHash(new BCryptPasswordEncoder().encode(request.getPassword()));
        user.setActive(true);

        user = userRepository.save(user);
        log.info("Usuário criado: {} no tenant {}", user.getEmail(), tenantId);

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("systemRole", user.getSystemRole() != null ? user.getSystemRole().name() : null);
        details.put("roleId", user.getRoleId() != null ? user.getRoleId().toString() : null);
        recordAudit(user.getTenantId(), "create", user.getId(), user.getEmail(), details);

        return userConverter.toResponse(user);
    }

    @Transactional
    @CacheEvict(value = UserPermissionsService.CACHE_NAME, key = "#id")
    public UserResponse update(UUID id, UUID tenantId, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        validateTenant(user, tenantId);

        Map<String, Object> before = snapshot(user);

        userConverter.updateFromRequest(request, user);

        user = userRepository.save(user);
        log.info("Usuário atualizado: {} no tenant {}", user.getEmail(), tenantId);

        Map<String, Object> after = snapshot(user);
        Map<String, Object> changes = diff(before, after);
        recordAudit(user.getTenantId(), "update", user.getId(), user.getEmail(),
                changes.isEmpty() ? null : changes);

        return userConverter.toResponse(user);
    }

    @Transactional
    public void changeCurrentUserPassword(UUID tenantId, ChangePasswordRequest request) {
        String email = resolveCurrentUserEmail();
        User user = userRepository.findByEmailAndTenantId(email, tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário autenticado não encontrado"));

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        if (!encoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Senha atual incorreta");
        }

        user.setPasswordHash(encoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Senha alterada para o usuário: {} no tenant {}", email, tenantId);

        recordAudit(user.getTenantId(), "change_password", user.getId(), user.getEmail(), null);
    }

    @Transactional
    @CacheEvict(value = UserPermissionsService.CACHE_NAME, key = "#id")
    public void delete(UUID id, UUID tenantId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        validateTenant(user, tenantId);
        user.setActive(false);
        userRepository.save(user);
        log.info("Usuário desativado (soft delete): {} no tenant {}", id, tenantId);

        recordAudit(user.getTenantId(), "delete", user.getId(), user.getEmail(), null);
    }

    private void validateTenant(User user, UUID tenantId) {
        if (user.getTenantId() == null || !user.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }

    private String resolveCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Usuário não autenticado");
        }
        return authentication.getName();
    }

    private void recordAudit(UUID tenantId, String action, UUID entityId, String entityName,
                             Map<String, Object> details) {
        try {
            String detailsJson = null;
            if (details != null && !details.isEmpty()) {
                try {
                    detailsJson = objectMapper.writeValueAsString(details);
                } catch (Exception e) {
                    detailsJson = details.toString();
                }
            }
            auditLogService.log(
                    tenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    action,
                    "user",
                    entityId,
                    entityName,
                    detailsJson,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar audit log (action={}, entityId={}): {}", action, entityId, e.getMessage());
        }
    }

    private Map<String, Object> snapshot(User user) {
        Map<String, Object> snap = new LinkedHashMap<>();
        snap.put("name", user.getName());
        snap.put("email", user.getEmail());
        snap.put("phone", user.getPhone());
        snap.put("avatarUrl", user.getAvatarUrl());
        snap.put("systemRole", user.getSystemRole() != null ? user.getSystemRole().name() : null);
        snap.put("roleId", user.getRoleId() != null ? user.getRoleId().toString() : null);
        snap.put("unitId", user.getUnitId() != null ? user.getUnitId().toString() : null);
        snap.put("active", user.isActive());
        return snap;
    }

    private Map<String, Object> diff(Map<String, Object> before, Map<String, Object> after) {
        Map<String, Object> changes = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : after.entrySet()) {
            String key = entry.getKey();
            Object newValue = entry.getValue();
            Object oldValue = before.get(key);
            if (!Objects.equals(oldValue, newValue)) {
                Map<String, Object> change = new LinkedHashMap<>();
                change.put("old", oldValue);
                change.put("new", newValue);
                changes.put(key, change);
            }
        }
        return changes;
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
}
