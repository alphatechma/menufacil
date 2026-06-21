package br.com.menufacil.config.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MetricsServiceTest {

    private MeterRegistry registry;
    private MetricsService metrics;

    @BeforeEach
    void setUp() {
        registry = new SimpleMeterRegistry();
        metrics = new MetricsService(registry);
    }

    @Test
    void deveCriarCounterDeNotificationComTags() {
        metrics.incrementNotificationSent("email", "sent");
        metrics.incrementNotificationSent("email", "sent");

        Counter c = registry.counter("notifications.sent", "channel", "email", "status", "sent");
        assertThat(c.count()).isEqualTo(2.0);
    }

    @Test
    void deveCriarCounterDeFlowExecutionPorTrigger() {
        metrics.incrementFlowExecution("keyword", "completed");
        metrics.incrementFlowExecution("schedule", "failed");

        assertThat(registry.counter("flow.executions",
                "trigger_type", "keyword", "result", "completed").count()).isEqualTo(1.0);
        assertThat(registry.counter("flow.executions",
                "trigger_type", "schedule", "result", "failed").count()).isEqualTo(1.0);
    }

    @Test
    void deveRegistrarDuracaoDeFluxoComoTimer() {
        metrics.recordFlowExecutionDuration(500L, "completed");
        metrics.recordFlowExecutionDuration(1500L, "completed");

        var timer = registry.timer("flow.execution.duration", "result", "completed");
        assertThat(timer.count()).isEqualTo(2);
        assertThat(timer.totalTime(java.util.concurrent.TimeUnit.MILLISECONDS))
                .isEqualTo(2000.0);
    }

    @Test
    void deveCriarCounterDeAuditLog() {
        metrics.incrementAuditLogCreated("Order", "create");

        Counter c = registry.counter("audit.logs.created",
                "entity_type", "Order", "action", "create");
        assertThat(c.count()).isEqualTo(1.0);
    }

    @Test
    void deveCriarCounterDeCleanupComContagemAcumulada() {
        metrics.incrementCleanupRemoved("notifications", 47);
        metrics.incrementCleanupRemoved("notifications", 3);

        Counter c = registry.counter("cleanup.removed", "table", "notifications");
        assertThat(c.count()).isEqualTo(50.0);
    }

    @Test
    void deveCriarCountersDeOrderEPagamento() {
        metrics.incrementOrderCreated("delivery", "pix");
        metrics.incrementPaymentWebhook("approved");

        assertThat(registry.counter("order.created",
                "order_type", "delivery", "payment_method", "pix").count()).isEqualTo(1.0);
        assertThat(registry.counter("payment.webhook", "status", "approved").count())
                .isEqualTo(1.0);
    }

    @Test
    void deveSubstituirNullPorUnknownNasTags() {
        metrics.incrementOrderCreated(null, null);

        Counter c = registry.counter("order.created",
                "order_type", "unknown", "payment_method", "unknown");
        assertThat(c.count()).isEqualTo(1.0);
    }
}
