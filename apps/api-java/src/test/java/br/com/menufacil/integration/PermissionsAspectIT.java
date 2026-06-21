package br.com.menufacil.integration;

import br.com.menufacil.config.security.JwtService;
import br.com.menufacil.domain.enums.UserRole;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.Role;
import br.com.menufacil.domain.models.Tenant;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.dto.CreateProductRequest;
import br.com.menufacil.repository.PermissionRepository;
import br.com.menufacil.repository.RoleRepository;
import br.com.menufacil.repository.TenantRepository;
import br.com.menufacil.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.jdbc.Sql;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Valida que o {@code PermissionsAspect} (equivalente do PermissionsGuard
 * do NestJS) bloqueia acessos quando o usuario nao tem a permissao exigida
 * via {@code @RequirePermissions}, mas permite quando tem.
 *
 * <p>Cenario: usuario manager com apenas {@code product:read} deve:
 * <ul>
 *     <li>GET /products/all -> 200 (tem product:read)</li>
 *     <li>POST /products -> 403 (faltando product:create)</li>
 * </ul>
 */
@Sql(scripts = "/integration-bootstrap.sql",
        executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class PermissionsAspectIT extends BaseIntegrationTest {

    @Autowired private JwtService jwtService;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private PermissionRepository permissionRepository;

    @Test
    @DisplayName("@RequirePermissions: usuario com product:read le; sem product:create nao cria")
    void permissionsAspect_enforcesGranularRules() {
        // --- Setup: tenant + role customizada com apenas product:read ---
        Tenant tenant = new Tenant();
        tenant.setName("Perm Test");
        tenant.setSlug("perm-" + UUID.randomUUID().toString().substring(0, 8));
        tenant.setActive(true);
        tenant = tenantRepository.save(tenant);

        Permission productRead = permissionRepository.findByKey("product:read")
                .orElseThrow(() -> new IllegalStateException(
                        "permission product:read nao foi seeded — verifique integration-bootstrap.sql"));

        Role role = new Role();
        role.setTenantId(tenant.getId());
        role.setName("ReadOnlyProducts");
        role.setSystemDefault(false);
        role.setPermissions(new HashSet<>(List.of(productRead)));
        role = roleRepository.save(role);

        User user = new User();
        user.setName("Read Only User");
        user.setEmail("ro-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local");
        user.setPasswordHash("$2a$10$irrelevant");
        user.setSystemRole(UserRole.manager); // NAO e admin -> nao bypassa
        user.setTenantId(tenant.getId());
        user.setRoleId(role.getId());
        user.setActive(true);
        user = userRepository.save(user);

        String token = JwtTestHelper.accessToken(
                jwtService, user, tenant.getId(), tenant.getSlug(),
                List.of("product:read"));

        // --- 1. GET /products/all com product:read -> 200 ---
        ResponseEntity<String> getResponse = restTemplate.exchange(
                url("/products/all"),
                HttpMethod.GET,
                new HttpEntity<>(JwtTestHelper.authHeaders(token, tenant.getSlug())),
                String.class);

        assertThat(getResponse.getStatusCode())
                .as("usuario com product:read deve conseguir listar produtos (status=%s body=%s)",
                        getResponse.getStatusCode(), getResponse.getBody())
                .isEqualTo(HttpStatus.OK);

        // --- 2. POST /products sem product:create -> 403 ---
        CreateProductRequest req = new CreateProductRequest();
        req.setName("Hamburguer Bloqueado");
        req.setBasePrice(new BigDecimal("29.90"));

        ResponseEntity<String> postResponse = restTemplate.exchange(
                url("/products"),
                HttpMethod.POST,
                new HttpEntity<>(req, JwtTestHelper.authHeaders(token, tenant.getSlug())),
                String.class);

        assertThat(postResponse.getStatusCode())
                .as("usuario sem product:create deve receber 403 (body=%s)", postResponse.getBody())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }
}
