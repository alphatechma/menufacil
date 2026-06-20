package br.com.menufacil.config.security;

import br.com.menufacil.domain.enums.UserRole;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.Role;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.repository.UserRepository;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Aspect que intercepta endpoints anotados com @RequirePermissions e valida
 * se o usuário autenticado possui as permissões granulares necessárias.
 *
 * Regras de bypass:
 *  - SUPER_ADMIN: acesso total a tudo
 *  - ADMIN: acesso total a tudo
 *
 * Para os demais perfis (MANAGER, CASHIER, KITCHEN, WAITER) o aspect carrega o
 * usuário do banco, extrai as chaves de permissão a partir de user.role.permissions
 * e compara com o array exigido pela annotation segundo o operador (AND/OR).
 *
 * Equivalente ao PermissionsGuard do NestJS.
 */
@Slf4j
@Aspect
@Component
@RequiredArgsConstructor
public class PermissionsAspect {

    private final UserRepository userRepository;

    @Around("@annotation(br.com.menufacil.config.security.RequirePermissions) "
            + "|| @within(br.com.menufacil.config.security.RequirePermissions)")
    public Object checkPermissions(ProceedingJoinPoint joinPoint) throws Throwable {
        RequirePermissions annotation = resolveAnnotation(joinPoint);
        if (annotation == null) {
            return joinPoint.proceed();
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Autenticação requerida");
        }

        // Bypass para SUPER_ADMIN e ADMIN
        if (hasAdminBypass(authentication)) {
            return joinPoint.proceed();
        }

        Set<String> userPermissions = loadUserPermissions(authentication);
        String[] required = annotation.value();
        RequirePermissions.LogicalOperator operator = annotation.operator();

        boolean allowed = (operator == RequirePermissions.LogicalOperator.OR)
                ? Arrays.stream(required).anyMatch(userPermissions::contains)
                : Arrays.stream(required).allMatch(userPermissions::contains);

        if (!allowed) {
            String mensagem = "Permissão insuficiente: requer " + String.join(
                    operator == RequirePermissions.LogicalOperator.OR ? " ou " : " e ",
                    required);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, mensagem);
        }

        return joinPoint.proceed();
    }

    private RequirePermissions resolveAnnotation(ProceedingJoinPoint joinPoint) {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();

        RequirePermissions annotation = method.getAnnotation(RequirePermissions.class);
        if (annotation != null) {
            return annotation;
        }
        return method.getDeclaringClass().getAnnotation(RequirePermissions.class);
    }

    private boolean hasAdminBypass(Authentication authentication) {
        for (GrantedAuthority authority : authentication.getAuthorities()) {
            String role = authority.getAuthority();
            if (role == null) {
                continue;
            }
            String normalized = role.toUpperCase();
            if ("ROLE_SUPER_ADMIN".equals(normalized) || "ROLE_ADMIN".equals(normalized)) {
                return true;
            }
        }
        return false;
    }

    private Set<String> loadUserPermissions(Authentication authentication) {
        UUID userId = extractUserId(authentication);
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token inválido: userId ausente");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Usuário não encontrado"));

        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário desativado");
        }

        // Bypass dupla checagem (caso JWT esteja desatualizado)
        UserRole systemRole = user.getSystemRole();
        if (systemRole == UserRole.super_admin || systemRole == UserRole.admin) {
            return collectAllAsBypass();
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

    private UUID extractUserId(Authentication authentication) {
        Object details = authentication.getDetails();
        if (details instanceof Claims claims) {
            String userId = claims.get("userId", String.class);
            if (userId != null && !userId.isBlank()) {
                try {
                    return UUID.fromString(userId);
                } catch (IllegalArgumentException ex) {
                    log.warn("userId no JWT inválido: {}", userId);
                }
            }
        }
        return null;
    }

    private Set<String> collectAllAsBypass() {
        Set<String> bypass = new HashSet<>();
        bypass.add("*");
        return bypass;
    }
}
