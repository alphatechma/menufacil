package br.com.menufacil.service;

import br.com.menufacil.config.observability.MetricsService;
import br.com.menufacil.domain.enums.NotificationStatus;
import br.com.menufacil.repository.NotificationRepository;
import br.com.menufacil.repository.WhatsappFlowWaitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Set;

/**
 * Worker responsável pelo cleanup diário (TTL) de tabelas que crescem
 * indefinidamente após registros atingirem seu estado terminal.
 *
 * <p>Tabelas alvo:</p>
 * <ul>
 *   <li><b>whatsapp_flow_waits</b>: remove registros já processados
 *       ({@code processed=true}) com {@code processed_at} anterior a 7 dias.
 *       O wait só serve enquanto pendente ou para auditoria de curto prazo.</li>
 *   <li><b>notifications</b>: remove registros em status final
 *       ({@code sent} ou {@code failed}) com {@code created_at} anterior a 30 dias.</li>
 * </ul>
 *
 * <p>A tabela {@code audit_logs} <b>NÃO</b> é limpa aqui — registros de auditoria
 * são preservados por compliance.</p>
 *
 * <p>Roda todo dia às 03h00 (janela de baixo tráfego). Pode ser desabilitado
 * por ambiente via {@code cleanup.enabled=false} (útil em dev).</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "cleanup.enabled", havingValue = "true", matchIfMissing = true)
public class CleanupWorker {

    /** TTL dos waits processados. */
    private static final int WAITS_RETENTION_DAYS = 7;

    /** TTL das notificações em estado final (sent/failed). */
    private static final int NOTIFICATIONS_RETENTION_DAYS = 30;

    /** Status finais elegíveis para purga. */
    private static final Set<NotificationStatus> FINAL_STATUSES =
            Set.of(NotificationStatus.sent, NotificationStatus.failed);

    private final WhatsappFlowWaitRepository whatsappFlowWaitRepository;
    private final NotificationRepository notificationRepository;
    private final MetricsService metricsService;

    /**
     * Executa o cleanup diariamente às 03h00.
     *
     * <p>Operação idempotente: rodar mais de uma vez é seguro — apenas registros
     * que ainda satisfazem o predicado de cutoff serão removidos.</p>
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void dailyCleanup() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime cutoff7d = now.minusDays(WAITS_RETENTION_DAYS);
        LocalDateTime cutoff30d = now.minusDays(NOTIFICATIONS_RETENTION_DAYS);

        int waitsRemoved = whatsappFlowWaitRepository
                .deleteByProcessedTrueAndProcessedAtBefore(cutoff7d);

        int notificationsRemoved = notificationRepository
                .deleteByStatusInAndCreatedAtBefore(FINAL_STATUSES, cutoff30d);

        metricsService.incrementCleanupRemoved("whatsapp_flow_waits", waitsRemoved);
        metricsService.incrementCleanupRemoved("notifications", notificationsRemoved);

        log.info("Cleanup diario: {} waits + {} notifications removidos",
                waitsRemoved, notificationsRemoved);
    }
}
