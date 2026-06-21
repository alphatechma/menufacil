package br.com.menufacil.integration;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.output.MigrateResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Valida que as migrations V1..V5 do Flyway aplicam <em>limpas</em> em um
 * Postgres totalmente vazio.
 * <p>
 * <strong>NOTA</strong>: este teste roda em um container <em>proprio</em>
 * (nao reusa o {@link BaseIntegrationTest#POSTGRES}) porque precisa de um
 * banco virgem onde o Hibernate ainda nao tenha criado nenhum schema via
 * {@code ddl-auto: create-drop}. Por isso ele <em>nao</em> estende
 * {@code BaseIntegrationTest} e nao inicializa o Spring context.
 * <p>
 * <strong>Caveat conhecido</strong>: a {@code V1__baseline.sql} e um no-op
 * por design (assume schema legado pre-criado pelo TypeORM). Em um Postgres
 * limpo isso significa que apenas V3..V5 criam tabelas <em>novas</em>; as
 * tabelas legadas (tenants, users, products, ...) nao existem ate que o
 * Hibernate seja invocado. O teste valida que <em>as migrations executam
 * sem erro</em> e que o estado final corresponde ao esperado para o setup
 * Flyway atual.
 */
@Testcontainers
class FlywayMigrationIT {

    @Test
    @DisplayName("Flyway V1..V5 aplicam clean em Postgres virgem")
    void migrationsApplyCleanly() {
        try (PostgreSQLContainer<?> pg = new PostgreSQLContainer<>(
                DockerImageName.parse("postgres:16-alpine"))
                .withDatabaseName("flyway_test")
                .withUsername("test")
                .withPassword("test")) {

            pg.start();

            Flyway flyway = Flyway.configure()
                    .dataSource(pg.getJdbcUrl(), pg.getUsername(), pg.getPassword())
                    .locations("classpath:db/migration")
                    .baselineOnMigrate(true)
                    .baselineVersion("0")
                    .validateOnMigrate(false)
                    .load();

            MigrateResult result = flyway.migrate();

            assertThat(result.success).isTrue();
            // Esperamos pelo menos as 5 migrations baseline (V1..V5).
            assertThat(result.migrationsExecuted)
                    .as("ao menos V1..V5 devem aplicar")
                    .isGreaterThanOrEqualTo(5);

            // Confere que todas as migrations aplicadas estao em estado SUCCESS
            MigrationInfo[] applied = flyway.info().applied();
            assertThat(applied).isNotEmpty();
            assertThat(applied)
                    .allSatisfy(mi -> assertThat(mi.getState().isApplied()).isTrue());
        }
    }
}
