package br.com.menufacil.integration;

import br.com.menufacil.config.security.JwtService;
import br.com.menufacil.dto.CreateTenantWithAdminRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cobre o fluxo completo de criacao de tenant pelo super admin:
 * <ol>
 *   <li>Super admin autenticado faz POST /super-admin/tenants</li>
 *   <li>SuperAdminService chama PL/pgSQL create_default_roles_for_tenant</li>
 *   <li>Validamos no banco que os 4 roles default foram criados</li>
 * </ol>
 *
 * <p>O bootstrap SQL (`integration-bootstrap.sql`) carrega a funcao
 * plpgsql e as 36 permissions, ja que o profile de teste desliga Flyway.
 */
@Sql(scripts = "/integration-bootstrap.sql",
        executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class TenantLifecycleIT extends BaseIntegrationTest {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("Super admin cria tenant + admin e os 4 roles default sao criados")
    void createTenantWithAdmin_createsDefaultRoles() {
        String superAdminToken = JwtTestHelper.superAdminToken(jwtService, "root@maistech.com.br");

        String slug = "lifecycle-" + UUID.randomUUID().toString().substring(0, 8);
        CreateTenantWithAdminRequest req = new CreateTenantWithAdminRequest();
        req.setName("Lifecycle Test Restaurant");
        req.setSlug(slug);
        req.setAdminName("Admin Lifecycle");
        req.setAdminEmail("admin-" + slug + "@test.local");
        req.setAdminPassword("test123456");

        HttpEntity<CreateTenantWithAdminRequest> entity =
                new HttpEntity<>(req, JwtTestHelper.authHeaders(superAdminToken, null));

        ResponseEntity<String> response = restTemplate.exchange(
                url("/super-admin/tenants"), HttpMethod.POST, entity, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).contains(slug);

        UUID tenantId = jdbc.queryForObject(
                "SELECT id FROM tenants WHERE slug = ?", UUID.class, slug);
        assertThat(tenantId).isNotNull();

        // Confere os 4 roles default
        List<String> roleNames = jdbc.queryForList(
                "SELECT name FROM roles WHERE tenant_id = ? AND is_system_default = TRUE ORDER BY name",
                String.class, tenantId);

        assertThat(roleNames)
                .as("4 roles default criados pela funcao plpgsql")
                .containsExactlyInAnyOrder("Cashier", "Kitchen", "Manager", "Waiter");

        // Manager deve ter todas as permissions exceto product:delete e category:delete
        Long managerPermCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM role_permissions rp " +
                        "JOIN roles r ON r.id = rp.role_id " +
                        "WHERE r.tenant_id = ? AND r.name = 'Manager'",
                Long.class, tenantId);
        assertThat(managerPermCount).isEqualTo(34L); // 36 - 2
    }
}
