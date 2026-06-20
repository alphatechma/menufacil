package br.com.menufacil.service;

import br.com.menufacil.converter.NotificationConverter;
import br.com.menufacil.domain.enums.NotificationStatus;
import br.com.menufacil.domain.models.Notification;
import br.com.menufacil.dto.CreateNotificationRequest;
import br.com.menufacil.dto.NotificationResponse;
import br.com.menufacil.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Serviço de notificações (stub).
 *
 * TODO: Implementar envio real de notificações:
 *   - Email via Mailgun ou SendGrid
 *   - WhatsApp via EvolutionApi
 *   - SMS via provedor a definir (Twilio, Zenvia)
 *   - Push via Firebase Cloud Messaging
 *
 * TODO: Job assíncrono para processar notificações pendentes
 *   - Usar Spring @Scheduled para varrer status=pending
 *   - Considerar fila (RabbitMQ/Kafka) caso o volume cresça
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationConverter notificationConverter;

    public List<NotificationResponse> listByTenant(UUID tenantId) {
        return notificationRepository.findByTenantId(tenantId).stream()
                .map(notificationConverter::toResponse)
                .toList();
    }

    public NotificationResponse getById(UUID id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Notificação não encontrada"));
        return notificationConverter.toResponse(notification);
    }

    @Transactional
    public NotificationResponse create(UUID tenantId, CreateNotificationRequest request) {
        Notification notification = notificationConverter.toEntity(request);
        notification.setTenantId(tenantId);
        notification.setStatus(NotificationStatus.pending);

        notification = notificationRepository.save(notification);
        log.info("Notificação criada: {} (canal={}, recipient={}) no tenant {}",
                notification.getId(), notification.getChannel(), notification.getRecipient(), tenantId);
        return notificationConverter.toResponse(notification);
    }

    @Transactional
    public NotificationResponse markAsSent(UUID id, UUID tenantId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Notificação não encontrada"));

        validateTenant(notification, tenantId);
        notification.setStatus(NotificationStatus.sent);
        notification.setSentAt(LocalDateTime.now());

        notification = notificationRepository.save(notification);
        log.info("Notificação marcada como enviada: {} no tenant {}", id, tenantId);
        return notificationConverter.toResponse(notification);
    }

    @Transactional
    public NotificationResponse markAsFailed(UUID id, UUID tenantId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Notificação não encontrada"));

        validateTenant(notification, tenantId);
        notification.setStatus(NotificationStatus.failed);

        notification = notificationRepository.save(notification);
        log.info("Notificação marcada como falhada: {} no tenant {}", id, tenantId);
        return notificationConverter.toResponse(notification);
    }

    private void validateTenant(Notification notification, UUID tenantId) {
        if (!notification.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
