package br.com.menufacil.config.observability;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;

/**
 * Fachada para emitir métricas customizadas de domínio.
 *
 * <p>Centraliza o nome dos meters e suas tags, evitando inconsistência
 * (ex.: "notification.sent" vs "notifications_sent_total"). Todos os meters
 * sao criados sob demanda e cacheados pelo Micrometer — é seguro chamar
 * de hot paths.</p>
 *
 * <p>Convenção de nomes (Micrometer → Prometheus):</p>
 * <ul>
 *   <li>{@code notifications.sent}      → {@code notifications_sent_total}</li>
 *   <li>{@code flow.executions}         → {@code flow_executions_total}</li>
 *   <li>{@code audit.logs.created}      → {@code audit_logs_created_total}</li>
 *   <li>{@code cleanup.removed}         → {@code cleanup_removed_total}</li>
 *   <li>{@code flow.execution.duration} → histograma de duração de fluxos</li>
 *   <li>{@code order.created}           → {@code order_created_total}</li>
 *   <li>{@code payment.webhook}         → {@code payment_webhook_total}</li>
 * </ul>
 */
@Component
public class MetricsService {

    private final MeterRegistry meterRegistry;

    public MetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }

    // -------------------------------------------------------------------------
    // Notificações
    // -------------------------------------------------------------------------

    /**
     * Incrementa counter de notificações enviadas (ou tentativas).
     *
     * @param channel canal da notificação (email, whatsapp, sms, push)
     * @param status  resultado do envio (sent, failed, skipped)
     */
    public void incrementNotificationSent(String channel, String status) {
        Counter.builder("notifications.sent")
                .description("Total de notificações processadas pelo NotificationWorker")
                .tag("channel", safe(channel))
                .tag("status", safe(status))
                .register(meterRegistry)
                .increment();
    }

    // -------------------------------------------------------------------------
    // Fluxos de WhatsApp
    // -------------------------------------------------------------------------

    /**
     * Incrementa counter de execucoes de fluxo de WhatsApp.
     *
     * @param triggerType tipo do trigger (keyword, schedule, manual)
     * @param result      started | completed | failed
     */
    public void incrementFlowExecution(String triggerType, String result) {
        Counter.builder("flow.executions")
                .description("Total de execucoes de fluxos de WhatsApp")
                .tag("trigger_type", safe(triggerType))
                .tag("result", safe(result))
                .register(meterRegistry)
                .increment();
    }

    /**
     * Registra a duração de uma execução completa de fluxo (do start ao end).
     */
    public void recordFlowExecutionDuration(long durationMs, String result) {
        Timer.builder("flow.execution.duration")
                .description("Duração das execucoes de fluxo de WhatsApp")
                .tag("result", safe(result))
                .publishPercentiles(0.5, 0.95, 0.99)
                .register(meterRegistry)
                .record(durationMs, TimeUnit.MILLISECONDS);
    }

    /**
     * Wrapper de timing — mede o tempo da operacao e incrementa o counter
     * de resultado automaticamente. Use em hot paths que precisem de ambos.
     */
    public <T> T timeFlowOperation(String triggerType, Supplier<T> operation) {
        long start = System.currentTimeMillis();
        String result = "completed";
        try {
            return operation.get();
        } catch (RuntimeException e) {
            result = "failed";
            throw e;
        } finally {
            long elapsed = System.currentTimeMillis() - start;
            recordFlowExecutionDuration(elapsed, result);
            incrementFlowExecution(triggerType, result);
        }
    }

    // -------------------------------------------------------------------------
    // Auditoria
    // -------------------------------------------------------------------------

    public void incrementAuditLogCreated(String entityType, String action) {
        Counter.builder("audit.logs.created")
                .description("Total de logs de auditoria criados")
                .tag("entity_type", safe(entityType))
                .tag("action", safe(action))
                .register(meterRegistry)
                .increment();
    }

    // -------------------------------------------------------------------------
    // Cleanup
    // -------------------------------------------------------------------------

    public void incrementCleanupRemoved(String table, long count) {
        Counter.builder("cleanup.removed")
                .description("Total de registros removidos pelo CleanupWorker")
                .tag("table", safe(table))
                .register(meterRegistry)
                .increment(count);
    }

    // -------------------------------------------------------------------------
    // Pedidos / Pagamentos
    // -------------------------------------------------------------------------

    public void incrementOrderCreated(String orderType, String paymentMethod) {
        Counter.builder("order.created")
                .description("Total de pedidos criados")
                .tag("order_type", safe(orderType))
                .tag("payment_method", safe(paymentMethod))
                .register(meterRegistry)
                .increment();
    }

    public void incrementPaymentWebhook(String status) {
        Counter.builder("payment.webhook")
                .description("Total de webhooks de pagamento processados")
                .tag("status", safe(status))
                .register(meterRegistry)
                .increment();
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private static String safe(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return value;
    }
}
