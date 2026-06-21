package br.com.menufacil.integration;

import br.com.menufacil.config.security.JwtService;
import br.com.menufacil.domain.enums.UserRole;
import br.com.menufacil.domain.models.User;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;

import java.net.URI;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Helpers para gerar JWTs <em>reais</em> nos testes de integracao usando
 * o {@link JwtService} do contexto Spring. Replica o formato emitido pelo
 * {@code AuthService.adminLogin} (mesmas claims).
 */
public final class JwtTestHelper {

    private JwtTestHelper() {}

    /**
     * Gera um access token equivalente ao emitido pelo login admin.
     *
     * @param jwtService bean JwtService do contexto Spring
     * @param user usuario para qual o token e gerado (precisa ja estar salvo)
     * @param tenantId UUID do tenant
     * @param tenantSlug slug do tenant
     * @param permissions lista de keys de permissoes (ex.: ["product:read","order:create"])
     */
    public static String accessToken(JwtService jwtService,
                                     User user,
                                     UUID tenantId,
                                     String tenantSlug,
                                     List<String> permissions) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("system_role", user.getSystemRole().name());
        claims.put("tenant_id", tenantId.toString());
        claims.put("tenant_slug", tenantSlug);
        claims.put("type", "access");
        claims.put("permissions", permissions);
        return jwtService.generateAccessToken(user.getEmail(), claims);
    }

    public static String superAdminToken(JwtService jwtService, String email) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", UUID.randomUUID().toString());
        claims.put("system_role", UserRole.super_admin.name());
        claims.put("type", "access");
        claims.put("permissions", List.of());
        return jwtService.generateAccessToken(email, claims);
    }

    /**
     * Monta um RequestEntity com headers de autenticacao + tenant slug.
     */
    public static RequestEntity<Void> authenticatedGet(String baseUrl, String accessToken, String tenantSlug) {
        HttpHeaders headers = authHeaders(accessToken, tenantSlug);
        return new RequestEntity<>(headers, HttpMethod.GET, URI.create(baseUrl));
    }

    public static HttpHeaders authHeaders(String accessToken, String tenantSlug) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        if (tenantSlug != null) {
            headers.add("X-Tenant-Slug", tenantSlug);
        }
        headers.add("Content-Type", "application/json");
        return headers;
    }
}
