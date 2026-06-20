package br.com.menufacil.config.security;

import br.com.menufacil.domain.enums.UserRole;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.Role;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.Signature;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Method;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

class PermissionsAspectTest {

    @Mock private UserRepository userRepository;
    @Mock private ProceedingJoinPoint joinPoint;
    @Mock private MethodSignature methodSignature;
    @Mock private Claims claims;

    @InjectMocks
    private PermissionsAspect permissionsAspect;

    private AutoCloseable closeable;

    @BeforeEach
    void setUp() {
        closeable = MockitoAnnotations.openMocks(this);
        SecurityContextHolder.clearContext();
    }

    @AfterEach
    void tearDown() throws Exception {
        SecurityContextHolder.clearContext();
        closeable.close();
    }

    // === Helpers ===

    @RequirePermissions("product:create")
    static class FakeSingleHandler {
        public void handle() {}
    }

    @RequirePermissions(value = {"product:read", "product:update"}, operator = RequirePermissions.LogicalOperator.AND)
    static class FakeAndHandler {
        public void handle() {}
    }

    @RequirePermissions(value = {"order:read", "kds:read"}, operator = RequirePermissions.LogicalOperator.OR)
    static class FakeOrHandler {
        public void handle() {}
    }

    private void mockJoinPointFor(Class<?> handlerClass) throws Throwable {
        Method method = handlerClass.getMethod("handle");
        when(joinPoint.getSignature()).thenReturn((Signature) methodSignature);
        when(methodSignature.getMethod()).thenReturn(method);
        lenient().when(joinPoint.proceed()).thenReturn("OK");
    }

    private void setAuthentication(UUID userId, String roleName) {
        when(claims.get("userId", String.class)).thenReturn(userId == null ? null : userId.toString());
        Authentication auth = new UsernamePasswordAuthenticationToken(
                "user@test.com",
                "token",
                List.of(new SimpleGrantedAuthority("ROLE_" + roleName.toUpperCase()))
        );
        ((UsernamePasswordAuthenticationToken) auth).setDetails(claims);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private User buildUser(UserRole systemRole, Set<String> permissionKeys) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@test.com");
        user.setSystemRole(systemRole);
        user.setActive(true);

        Role role = new Role();
        Set<Permission> perms = new HashSet<>();
        for (String key : permissionKeys) {
            Permission p = new Permission();
            p.setKey(key);
            p.setName(key);
            perms.add(p);
        }
        role.setPermissions(perms);
        user.setRole(role);
        return user;
    }

    // === Testes ===

    @Test
    void shouldPermitirAcessoQuandoUsuarioForSuperAdmin() throws Throwable {
        // Arrange
        mockJoinPointFor(FakeSingleHandler.class);
        setAuthentication(UUID.randomUUID(), "super_admin");

        // Act
        Object result = permissionsAspect.checkPermissions(joinPoint);

        // Assert
        assertThat(result).isEqualTo("OK");
    }

    @Test
    void shouldPermitirAcessoQuandoUsuarioForAdmin() throws Throwable {
        // Arrange
        mockJoinPointFor(FakeSingleHandler.class);
        setAuthentication(UUID.randomUUID(), "admin");

        // Act
        Object result = permissionsAspect.checkPermissions(joinPoint);

        // Assert
        assertThat(result).isEqualTo("OK");
    }

    @Test
    void shouldPermitirAcessoQuandoUsuarioPossuiPermissaoExigida() throws Throwable {
        // Arrange
        mockJoinPointFor(FakeSingleHandler.class);
        UUID userId = UUID.randomUUID();
        setAuthentication(userId, "manager");
        User user = buildUser(UserRole.manager, Set.of("product:create", "product:read"));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        Object result = permissionsAspect.checkPermissions(joinPoint);

        // Assert
        assertThat(result).isEqualTo("OK");
    }

    @Test
    void shouldNegarAcessoQuandoUsuarioNaoPossuiPermissao() throws Throwable {
        // Arrange
        mockJoinPointFor(FakeSingleHandler.class);
        UUID userId = UUID.randomUUID();
        setAuthentication(userId, "cashier");
        User user = buildUser(UserRole.cashier, Set.of("order:read"));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act + Assert
        assertThatThrownBy(() -> permissionsAspect.checkPermissions(joinPoint))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void shouldExigirTodasPermissoesQuandoOperadorForAnd() throws Throwable {
        // Arrange — usuário tem só uma das duas exigidas (AND)
        mockJoinPointFor(FakeAndHandler.class);
        UUID userId = UUID.randomUUID();
        setAuthentication(userId, "manager");
        User user = buildUser(UserRole.manager, Set.of("product:read"));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act + Assert
        assertThatThrownBy(() -> permissionsAspect.checkPermissions(joinPoint))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void shouldPermitirComUmaPermissaoQuandoOperadorForOr() throws Throwable {
        // Arrange — usuário tem uma das duas exigidas (OR)
        mockJoinPointFor(FakeOrHandler.class);
        UUID userId = UUID.randomUUID();
        setAuthentication(userId, "kitchen");
        User user = buildUser(UserRole.kitchen, Set.of("kds:read"));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act
        Object result = permissionsAspect.checkPermissions(joinPoint);

        // Assert
        assertThat(result).isEqualTo("OK");
    }

    @Test
    void shouldNegarAcessoQuandoUsuarioNaoAutenticado() throws Throwable {
        // Arrange
        mockJoinPointFor(FakeSingleHandler.class);
        // SecurityContext vazio

        // Act + Assert
        assertThatThrownBy(() -> permissionsAspect.checkPermissions(joinPoint))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void shouldNegarAcessoQuandoUsuarioEstaDesativado() throws Throwable {
        // Arrange
        mockJoinPointFor(FakeSingleHandler.class);
        UUID userId = UUID.randomUUID();
        setAuthentication(userId, "manager");
        User user = buildUser(UserRole.manager, Set.of("product:create"));
        user.setActive(false);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        // Act + Assert
        assertThatThrownBy(() -> permissionsAspect.checkPermissions(joinPoint))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
