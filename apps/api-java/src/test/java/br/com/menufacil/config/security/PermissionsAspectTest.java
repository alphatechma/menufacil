package br.com.menufacil.config.security;

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
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

class PermissionsAspectTest {

    @Mock private UserPermissionsService userPermissionsService;
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

    // === Testes ===

    @Test
    void shouldPermitirAcessoQuandoUsuarioForSuperAdmin() throws Throwable {
        mockJoinPointFor(FakeSingleHandler.class);
        setAuthentication(UUID.randomUUID(), "super_admin");

        Object result = permissionsAspect.checkPermissions(joinPoint);

        assertThat(result).isEqualTo("OK");
    }

    @Test
    void shouldPermitirAcessoQuandoUsuarioForAdmin() throws Throwable {
        mockJoinPointFor(FakeSingleHandler.class);
        setAuthentication(UUID.randomUUID(), "admin");

        Object result = permissionsAspect.checkPermissions(joinPoint);

        assertThat(result).isEqualTo("OK");
    }

    @Test
    void shouldPermitirAcessoQuandoUsuarioPossuiPermissaoExigida() throws Throwable {
        mockJoinPointFor(FakeSingleHandler.class);
        UUID userId = UUID.randomUUID();
        setAuthentication(userId, "manager");
        when(userPermissionsService.findPermissionKeysByUserId(userId))
                .thenReturn(Set.of("product:create", "product:read"));

        Object result = permissionsAspect.checkPermissions(joinPoint);

        assertThat(result).isEqualTo("OK");
    }

    @Test
    void shouldNegarAcessoQuandoUsuarioNaoPossuiPermissao() throws Throwable {
        mockJoinPointFor(FakeSingleHandler.class);
        UUID userId = UUID.randomUUID();
        setAuthentication(userId, "cashier");
        when(userPermissionsService.findPermissionKeysByUserId(userId))
                .thenReturn(Set.of("order:read"));

        assertThatThrownBy(() -> permissionsAspect.checkPermissions(joinPoint))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void shouldExigirTodasPermissoesQuandoOperadorForAnd() throws Throwable {
        mockJoinPointFor(FakeAndHandler.class);
        UUID userId = UUID.randomUUID();
        setAuthentication(userId, "manager");
        when(userPermissionsService.findPermissionKeysByUserId(userId))
                .thenReturn(Set.of("product:read"));

        assertThatThrownBy(() -> permissionsAspect.checkPermissions(joinPoint))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void shouldPermitirComUmaPermissaoQuandoOperadorForOr() throws Throwable {
        mockJoinPointFor(FakeOrHandler.class);
        UUID userId = UUID.randomUUID();
        setAuthentication(userId, "kitchen");
        when(userPermissionsService.findPermissionKeysByUserId(userId))
                .thenReturn(Set.of("kds:read"));

        Object result = permissionsAspect.checkPermissions(joinPoint);

        assertThat(result).isEqualTo("OK");
    }

    @Test
    void shouldNegarAcessoQuandoUsuarioNaoAutenticado() throws Throwable {
        mockJoinPointFor(FakeSingleHandler.class);

        assertThatThrownBy(() -> permissionsAspect.checkPermissions(joinPoint))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void shouldNegarAcessoQuandoUsuarioEstaDesativado() throws Throwable {
        mockJoinPointFor(FakeSingleHandler.class);
        UUID userId = UUID.randomUUID();
        setAuthentication(userId, "manager");
        when(userPermissionsService.findPermissionKeysByUserId(userId))
                .thenThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário desativado"));

        assertThatThrownBy(() -> permissionsAspect.checkPermissions(joinPoint))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
