package br.com.menufacil.config.observability.health;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * HealthIndicator da Evolution API (WhatsApp).
 *
 * <p>Faz um GET em {@code /} (raiz) da Evolution com timeout curto.
 * Se a base URL não estiver configurada, reporta UNKNOWN (não DOWN),
 * pois em dev a Evolution pode estar legitimamente offline.</p>
 *
 * <p>Não inclui credenciais — basta validar conectividade TCP/HTTP.</p>
 */
@Slf4j
@Component("evolutionApi")
public class EvolutionApiHealthIndicator implements HealthIndicator {

    private static final Duration TIMEOUT = Duration.ofSeconds(2);

    private final String baseUrl;
    private final String apiKey;
    private final RestClient restClient;

    public EvolutionApiHealthIndicator(
            @Value("${evolution.api.url:}") String baseUrl,
            @Value("${evolution.api.key:}") String apiKey) {
        this.baseUrl = baseUrl != null ? baseUrl.replaceAll("/+$", "") : "";
        this.apiKey = apiKey != null ? apiKey : "";
        this.restClient = RestClient.builder().build();
    }

    @Override
    public Health health() {
        if (baseUrl.isBlank()) {
            return Health.unknown()
                    .withDetail("reason", "evolution.api.url not configured")
                    .build();
        }

        long start = System.currentTimeMillis();
        try {
            ResponseEntity<String> response = restClient.method(HttpMethod.GET)
                    .uri(baseUrl + "/")
                    .header(HttpHeaders.ACCEPT, "application/json")
                    .header("apikey", apiKey)
                    .retrieve()
                    .toEntity(String.class);

            long elapsed = System.currentTimeMillis() - start;
            int status = response.getStatusCode().value();

            Health.Builder builder = (status >= 200 && status < 500)
                    ? Health.up()
                    : Health.down();

            return builder
                    .withDetail("url", baseUrl)
                    .withDetail("status", status)
                    .withDetail("latency_ms", elapsed)
                    .build();
        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - start;
            log.warn("EvolutionApi health check falhou ({}ms): {}", elapsed, e.getMessage());
            return Health.down()
                    .withDetail("url", baseUrl)
                    .withDetail("error", e.getClass().getSimpleName())
                    .withDetail("message", e.getMessage())
                    .withDetail("latency_ms", elapsed)
                    .build();
        }
    }
}
