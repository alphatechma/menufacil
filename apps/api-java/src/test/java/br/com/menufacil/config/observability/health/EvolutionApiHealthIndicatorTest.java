package br.com.menufacil.config.observability.health;

import org.junit.jupiter.api.Test;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.Status;

import static org.assertj.core.api.Assertions.assertThat;

class EvolutionApiHealthIndicatorTest {

    @Test
    void deveRetornarUnknownQuandoBaseUrlVazia() {
        EvolutionApiHealthIndicator indicator =
                new EvolutionApiHealthIndicator("", "any-key");

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.UNKNOWN);
        assertThat(health.getDetails()).containsEntry("reason", "evolution.api.url not configured");
    }

    @Test
    void deveRetornarDownQuandoUrlInvalida() {
        // Endpoint local não-roteavel: força DOWN sem depender de rede externa.
        EvolutionApiHealthIndicator indicator =
                new EvolutionApiHealthIndicator("http://127.0.0.1:1", "any-key");

        Health health = indicator.health();

        assertThat(health.getStatus()).isEqualTo(Status.DOWN);
        assertThat(health.getDetails()).containsKey("error");
        assertThat(health.getDetails()).containsKey("latency_ms");
    }
}
