package br.com.menufacil.service.notification;

import br.com.menufacil.domain.enums.NotificationChannel;
import br.com.menufacil.domain.enums.NotificationStatus;
import br.com.menufacil.domain.models.Notification;
import br.com.menufacil.repository.NotificationRepository;
import br.com.menufacil.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class NotificationWorkerTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private NotificationService notificationService;
    @Mock private EmailSender emailSender;

    @InjectMocks
    private NotificationWorker worker;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldEnviarEmailEMarcarComoSent() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Notification pending = buildEmail(id, tenantId, "cliente@example.com", "Pedido confirmado");

        when(notificationRepository.findTop50ByStatusOrderByCreatedAtAsc(NotificationStatus.pending))
                .thenReturn(List.of(pending));

        // Act
        worker.processPendingNotifications();

        // Assert
        verify(emailSender).send(eq("cliente@example.com"), eq("MenuFacil"), eq("Pedido confirmado"));
        verify(notificationService).markAsSent(id, tenantId);
        verify(notificationService, never()).markAsFailed(any(), any());
    }

    @Test
    void shouldMarcarComoFailedQuandoEmailSenderLancaExcecao() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Notification pending = buildEmail(id, tenantId, "ruim@example.com", "conteudo");

        when(notificationRepository.findTop50ByStatusOrderByCreatedAtAsc(NotificationStatus.pending))
                .thenReturn(List.of(pending));
        doThrow(new RuntimeException("SES indisponivel"))
                .when(emailSender).send(anyString(), anyString(), anyString());

        // Act
        worker.processPendingNotifications();

        // Assert
        verify(emailSender).send(eq("ruim@example.com"), eq("MenuFacil"), eq("conteudo"));
        verify(notificationService).markAsFailed(id, tenantId);
        verify(notificationService, never()).markAsSent(any(), any());
    }

    @Test
    void shouldMarcarCanaisNaoImplementadosComoFailed() {
        // Arrange
        UUID smsId = UUID.randomUUID();
        UUID smsTenant = UUID.randomUUID();
        Notification sms = buildEmail(smsId, smsTenant, "+5511999999999", "msg");
        sms.setChannel(NotificationChannel.sms);

        UUID waId = UUID.randomUUID();
        UUID waTenant = UUID.randomUUID();
        Notification wa = buildEmail(waId, waTenant, "+5511988888888", "msg");
        wa.setChannel(NotificationChannel.whatsapp);

        when(notificationRepository.findTop50ByStatusOrderByCreatedAtAsc(NotificationStatus.pending))
                .thenReturn(List.of(sms, wa));

        // Act
        worker.processPendingNotifications();

        // Assert
        verifyNoInteractions(emailSender);
        verify(notificationService).markAsFailed(smsId, smsTenant);
        verify(notificationService).markAsFailed(waId, waTenant);
        verify(notificationService, never()).markAsSent(any(), any());
    }

    @Test
    void shouldNaoFazerNadaQuandoNaoHaPendentes() {
        // Arrange
        when(notificationRepository.findTop50ByStatusOrderByCreatedAtAsc(NotificationStatus.pending))
                .thenReturn(Collections.emptyList());

        // Act
        worker.processPendingNotifications();

        // Assert
        verifyNoInteractions(emailSender);
        verifyNoInteractions(notificationService);
    }

    @Test
    void shouldProcessarMultiplasNotificacoesIndependentemente() {
        // Arrange — uma sucesso, uma falha; ambas devem ser tentadas
        UUID okId = UUID.randomUUID();
        UUID okTenant = UUID.randomUUID();
        Notification ok = buildEmail(okId, okTenant, "ok@example.com", "boa");

        UUID failId = UUID.randomUUID();
        UUID failTenant = UUID.randomUUID();
        Notification fail = buildEmail(failId, failTenant, "fail@example.com", "ruim");

        when(notificationRepository.findTop50ByStatusOrderByCreatedAtAsc(NotificationStatus.pending))
                .thenReturn(List.of(ok, fail));
        doThrow(new RuntimeException("erro"))
                .when(emailSender).send(eq("fail@example.com"), anyString(), anyString());

        // Act
        worker.processPendingNotifications();

        // Assert
        verify(emailSender).send(eq("ok@example.com"), eq("MenuFacil"), eq("boa"));
        verify(emailSender).send(eq("fail@example.com"), eq("MenuFacil"), eq("ruim"));
        verify(notificationService).markAsSent(okId, okTenant);
        verify(notificationService).markAsFailed(failId, failTenant);
    }

    @Test
    void shouldNaoEstourarQuandoMarkAsFailedLancaExcecao() {
        // Arrange — emailSender falha e markAsFailed também; worker engole pra não derrubar o loop
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Notification pending = buildEmail(id, tenantId, "x@example.com", "x");

        when(notificationRepository.findTop50ByStatusOrderByCreatedAtAsc(NotificationStatus.pending))
                .thenReturn(List.of(pending));
        doThrow(new RuntimeException("SES off"))
                .when(emailSender).send(anyString(), anyString(), anyString());
        doThrow(new RuntimeException("DB off"))
                .when(notificationService).markAsFailed(id, tenantId);

        // Act — não deve lançar
        worker.processPendingNotifications();

        // Assert
        verify(emailSender).send(eq("x@example.com"), eq("MenuFacil"), eq("x"));
        verify(notificationService).markAsFailed(id, tenantId);
    }

    private Notification buildEmail(UUID id, UUID tenantId, String recipient, String content) {
        Notification n = new Notification();
        n.setId(id);
        n.setTenantId(tenantId);
        n.setChannel(NotificationChannel.email);
        n.setStatus(NotificationStatus.pending);
        n.setRecipient(recipient);
        n.setContent(content);
        return n;
    }
}
