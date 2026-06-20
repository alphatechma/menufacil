package br.com.menufacil.config.security;

import br.com.menufacil.domain.enums.UserRole;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.Role;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Serviço dedicado a carregar permissões granulares do usuário, com cache em memória.
 * A invalidação acontece via {@code @CacheEvict} em UserService/RoleService/PermissionService
 * (futuro — hoje o cache vive até reinício da aplicação).
 *
 * <p>Os bypasses de SUPER_ADMIN e ADMIN são tratados pelo {@link PermissionsAspect}
 * antes mesmo de invocar este serviço — não fica em cache.
 */
@Service
@RequiredArgsConstructor
public class UserPermissionsService {

    public static final String CACHE_NAME = "user-permissions";

    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = CACHE_NAME, key = "#userId")
    public Set<String> findPermissionKeysByUserId(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "Usuário não encontrado"));

        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário desativado");
        }

        UserRole systemRole = user.getSystemRole();
        if (systemRole == UserRole.super_admin || systemRole == UserRole.admin) {
            return Set.of("*");
        }

        Role role = user.getRole();
        if (role == null || role.getPermissions() == null || role.getPermissions().isEmpty()) {
            return new HashSet<>();
        }

        return role.getPermissions().stream()
                .map(Permission::getKey)
                .filter(key -> key != null && !key.isBlank())
                .collect(Collectors.toSet());
    }
}
