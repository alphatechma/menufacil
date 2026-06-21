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

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Valida que a criacao de um tenant pelo super admin gera o audit_log
 * correspondente (acao=create, entityType=tenant) persistido pelo
 * {@code AuditLogService}.
 *
 * <p>Em vez de chamar GET /super-admin/audit-logs (que exige X-Tenant-Slug
 * e permission report:read), checamos diretamente a tabela
 * {@code audit_logs} via JdbcTemplate — isso isola o teste do bypass de
 * permissoes e do TenantFilter.
 */
@Sql(scripts = "/integration-bootstrap.sql",
        executionPhase = Sql.ExecutionPhase.BEFORE_TEST_METHOD)
class AuditLogPersistenceIT extends BaseIntegrationTest {

    @Autowired private JwtService jwtService;
    @Autowired private JdbcTemplate jdbc;

    @Test
    @DisplayName("POST /super-admin/tenants persiste audit_log com action=create entityType=tenant")
    void createTenant_writesAuditLog() {
        String superAdminToken = JwtTestHelper.superAdminToken(jwtService, "audit@maistech.com.br");

        String slug = "audit-" + UUID.randomUUID().toString().substring(0, 8);
        CreateTenantWithAdminRequest req = new CreateTenantWithAdminRequest();
        req.setName("Audit Test Restaurant");
        req.setSlug(slug);
        req.setAdminName("Audit Admin");
        req.setAdminEmail("admin-" + slug + "@test.local");
        req.setAdminPassword("test123456");

        HttpEntity<CreateTenantWithAdminRequest> entity =
                new HttpEntity<>(req, JwtTestHelper.authHeaders(superAdminToken, null));

        ResponseEntity<String> response = restTemplate.exchange(
                url("/super-admin/tenants"), HttpMethod.POST, entity, String.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        UUID tenantId = jdbc.queryForObject(
                "SELECT id FROM tenants WHERE slug = ?", UUID.class, slug);
        assertThat(tenantId).isNotNull();

        // Verifica audit log
        Map<String, Object> log = jdbc.queryForMap(
                "SELECT action, entity_type, entity_id, entity_name, user_email " +
                        "FROM audit_logs " +
                        "WHERE entity_type = 'tenant' AND entity_id = ?",
                tenantId);

        assertThat(log).isNotNull();
        assertThat(log.get("action")).isEqualTo("create");
        assertThat(log.get("entity_type")).isEqualTo("tenant");
        assertThat(log.get("entity_id")).isEqualTo(tenantId);
        assertThat(log.get("entity_name")).isEqualTo("Audit Test Restaurant");
        // user_email vem do JWT (audit@maistech.com.br) OU "system" se nao resolvido
        assertThat((String) log.get("user_email")).isNotBlank();
    }
}
