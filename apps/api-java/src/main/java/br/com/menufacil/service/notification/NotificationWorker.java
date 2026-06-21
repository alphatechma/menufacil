package br.com.menufacil.service.notification;

import br.com.menufacil.config.observability.MetricsService;
import br.com.menufacil.domain.enums.NotificationChannel;
import br.com.menufacil.domain.enums.NotificationStatus;
import br.com.menufacil.domain.models.Notification;
import br.com.menufacil.repository.NotificationRepository;
import br.com.menufacil.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Worker que processa notificações pendentes em intervalos regulares.
 *
 * Canais suportados:
 *  - {@link NotificationChannel#email} (via {@link EmailSender})
 *  - {@link NotificationChannel#whatsapp} (via {@link WhatsappSender})
 *
 * Outros canais (sms, push) são marcados como failed enquanto não houver
 * implementação dedicada.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationWorker {

    private static final String SUBJECT = "MenuFacil";
    private static final String CHANNEL_NOT_IMPLEMENTED = "channel not implemented";

    private final NotificationRepository notificationRepository;
    private final NotificationService notificationService;
    private final EmailSender emailSender;
    private final WhatsappSender whatsappSender;
    private final MetricsService metricsService;

    /**
     * Varre as notificações em status=pending e tenta enviá-las.
     * Executa a cada 30 segundos após o término da execução anterior.
     */
    @Scheduled(fixedDelay = 30_000L)
    public void processPendingNotifications() {
        List<Notification> pending =
                notificationRepository.findTop50ByStatusOrderByCreatedAtAsc(NotificationStatus.pending);

        if (pending.isEmpty()) {
            return;
        }

        log.debug("NotificationWorker: processando {} notificação(ões) pendentes", pending.size());

        for (Notification notification : pending) {
            processOne(notification);
        }
    }

    private void processOne(Notification notification) {
        NotificationChannel channel = notification.getChannel();

        if (channel == NotificationChannel.email) {
            sendEmail(notification);
            return;
        }

        if (channel == NotificationChannel.whatsapp) {
            sendWhatsapp(notification);
            return;
        }

        // Canais ainda não implementados → marca como failed pra não ficar preso na fila
        log.warn("NotificationWorker: canal {} ainda não implementado (notification={})",
                channel, notification.getId());
        markFailedSafely(notification, CHANNEL_NOT_IMPLEMENTED);
        metricsService.incrementNotificationSent(channelTag(channel), "skipped");
    }

    private void sendEmail(Notification notification) {
        try {
            emailSender.send(notification.getRecipient(), SUBJECT, notification.getContent());
            notificationService.markAsSent(notification.getId(), notification.getTenantId());
            metricsService.incrementNotificationSent("email", "sent");
        } catch (RuntimeException e) {
            log.error("NotificationWorker: falha ao enviar email notification={} recipient={}: {}",
                    notification.getId(), notification.getRecipient(), e.getMessage(), e);
            markFailedSafely(notification, e.getMessage());
            metricsService.incrementNotificationSent("email", "failed");
        }
    }

    private void sendWhatsapp(Notification notification) {
        try {
            whatsappSender.send(
                    notification.getTenantId(),
                    notification.getRecipient(),
                    notification.getContent());
            notificationService.markAsSent(notification.getId(), notification.getTenantId());
            metricsService.incrementNotificationSent("whatsapp", "sent");
        } catch (RuntimeException e) {
            log.error("NotificationWorker: falha ao enviar whatsapp notification={} recipient={}: {}",
                    notification.getId(), notification.getRecipient(), e.getMessage(), e);
            markFailedSafely(notification, e.getMessage());
            metricsService.incrementNotificationSent("whatsapp", "failed");
        }
    }

    private void markFailedSafely(Notification notification, String reason) {
        try {
            notificationService.markAsFailed(notification.getId(), notification.getTenantId());
        } catch (RuntimeException e) {
            log.error("NotificationWorker: falha ao marcar notification={} como failed (motivo original={}): {}",
                    notification.getId(), reason, e.getMessage(), e);
        }
    }

    private static String channelTag(NotificationChannel channel) {
        return channel != null ? channel.name() : "unknown";
    }
}
