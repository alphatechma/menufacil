package br.com.menufacil.config.observability;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.config.MeterFilter;
import org.springframework.boot.actuate.autoconfigure.metrics.MeterRegistryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuração global do Micrometer.
 *
 * <p>Adiciona tags padrão a todos os meters (application, environment) e
 * registra filtros leves (ex.: limita cardinalidade de tags problemáticos).</p>
 *
 * <p>Métricas customizadas de domínio são criadas em
 * {@link MetricsService} via {@link MeterRegistry} injetado.</p>
 */
@Configuration
public class MetricsConfig {

    /**
     * Customizer aplicado a TODOS os {@link MeterRegistry} criados pelo Spring Boot.
     * Garante que cada métrica carregue tags "application" e "service"
     * — usadas pelo Prometheus/Grafana para roteamento por serviço.
     */
    @Bean
    public MeterRegistryCustomizer<MeterRegistry> meterRegistryCommonTags() {
        return registry -> registry.config()
                .commonTags("service", "menufacil-api");
    }

    /**
     * Limita cardinalidade do tag {@code uri} em http.server.requests
     * (default do Spring Boot já cobre, mas reforça aqui).
     */
    @Bean
    public MeterFilter denyUnknownUriHttpMetrics() {
        return MeterFilter.deny(id -> {
            if (!"http.server.requests".equals(id.getName())) {
                return false;
            }
            String uri = id.getTag("uri");
            return uri != null && uri.startsWith("/actuator");
        });
    }
}
