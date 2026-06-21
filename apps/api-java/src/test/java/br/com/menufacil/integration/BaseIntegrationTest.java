package br.com.menufacil.integration;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Base para todos os testes de integracao do api-java.
 * <p>
 * Provisiona um Postgres 16-alpine via Testcontainers (com reuse) e injeta
 * datasource/credenciais via {@link DynamicPropertySource}.
 * <p>
 * <strong>Decisoes de isolamento</strong>
 * <ul>
 *   <li>Container e <em>static</em> e marcado com {@code withReuse(true)} — assim
 *       um unico container e reusado entre todos os ITs da suite (e entre execucoes
 *       locais quando o usuario tem {@code testcontainers.reuse.enable=true} no
 *       {@code ~/.testcontainers.properties}).</li>
 *   <li>Nao usamos {@code @Transactional} no nivel da classe base porque os
 *       endpoints HTTP rodam em transacoes proprias do controller/service.
 *       Cada teste que precisar de isolamento deve usar {@code @Transactional}
 *       individualmente OU limpar dados via {@link org.springframework.jdbc.core.JdbcTemplate}
 *       no {@code @AfterEach}.</li>
 *   <li>{@code webEnvironment = RANDOM_PORT} para suportar testes paralelos
 *       futuros e para evitar conflito com a porta 3001 do dev local.</li>
 * </ul>
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("integration-test")
@Testcontainers
public abstract class BaseIntegrationTest {

    /**
     * Container compartilhado entre todos os ITs (reuse=true).
     * Sera startado uma unica vez por JVM e reaproveitado.
     */
    @SuppressWarnings("resource")
    protected static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
                    .withDatabaseName("menufacil_test")
                    .withUsername("test")
                    .withPassword("test")
                    .withReuse(true);

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void registerPgProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }

    @LocalServerPort
    protected int port;

    @Autowired
    protected TestRestTemplate restTemplate;

    protected String url(String path) {
        return "http://localhost:" + port + "/api" + path;
    }
}
