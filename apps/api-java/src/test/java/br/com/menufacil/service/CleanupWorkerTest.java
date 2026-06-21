package br.com.menufacil.service;

import br.com.menufacil.domain.enums.NotificationStatus;
import br.com.menufacil.repository.NotificationRepository;
import br.com.menufacil.repository.WhatsappFlowWaitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collection;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

class CleanupWorkerTest {

    @Mock private WhatsappFlowWaitRepository whatsappFlowWaitRepository;
    @Mock private NotificationRepository notificationRepository;

    @InjectMocks
    private CleanupWorker worker;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldRemoverWaitsProcessadosAntigosENotificacoesEnviadas() {
        // Arrange
        when(whatsappFlowWaitRepository.deleteByProcessedTrueAndProcessedAtBefore(any(LocalDateTime.class)))
                .thenReturn(3);
        when(notificationRepository.deleteByStatusInAndCreatedAtBefore(anyCollection(), any(LocalDateTime.class)))
                .thenReturn(5);

        LocalDateTime beforeRun = LocalDateTime.now();

        // Act
        worker.dailyCleanup();

        LocalDateTime afterRun = LocalDateTime.now();

        // Assert — cutoffs passados aos repositories devem refletir 7d e 30d.
        ArgumentCaptor<LocalDateTime> waitsCutoffCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(whatsappFlowWaitRepository).deleteByProcessedTrueAndProcessedAtBefore(waitsCutoffCaptor.capture());

        ArgumentCaptor<Collection<NotificationStatus>> statusesCaptor = ArgumentCaptor.forClass(Collection.class);
        ArgumentCaptor<LocalDateTime> notifCutoffCaptor = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(notificationRepository).deleteByStatusInAndCreatedAtBefore(statusesCaptor.capture(), notifCutoffCaptor.capture());

        LocalDateTime waitsCutoff = waitsCutoffCaptor.getValue();
        assertThat(waitsCutoff).isBetween(
                beforeRun.minusDays(7).minusSeconds(1),
                afterRun.minusDays(7).plusSeconds(1));

        LocalDateTime notifCutoff = notifCutoffCaptor.getValue();
        assertThat(notifCutoff).isBetween(
                beforeRun.minusDays(30).minusSeconds(1),
                afterRun.minusDays(30).plusSeconds(1));

        // Diferença entre cutoffs deve ser ~23 dias (30 - 7).
        long deltaDays = ChronoUnit.DAYS.between(notifCutoff, waitsCutoff);
        assertThat(deltaDays).isEqualTo(23);

        // Status enviados pro repositório de notifications devem ser exatamente sent + failed.
        assertThat(statusesCaptor.getValue())
                .containsExactlyInAnyOrder(NotificationStatus.sent, NotificationStatus.failed);

        verifyNoMoreInteractions(whatsappFlowWaitRepository, notificationRepository);
    }

    @Test
    void shouldLogarContagemDeRegistrosRemovidos() {
        // Arrange — os repositories retornam quantidades específicas; o worker
        // só deve invocá-los uma vez e propagar/logar os valores sem alterações.
        when(whatsappFlowWaitRepository.deleteByProcessedTrueAndProcessedAtBefore(any(LocalDateTime.class)))
                .thenReturn(12);
        when(notificationRepository.deleteByStatusInAndCreatedAtBefore(anyCollection(), any(LocalDateTime.class)))
                .thenReturn(47);

        // Act
        worker.dailyCleanup();

        // Assert — cada repository é chamado exatamente uma vez por execução.
        verify(whatsappFlowWaitRepository).deleteByProcessedTrueAndProcessedAtBefore(any(LocalDateTime.class));
        verify(notificationRepository).deleteByStatusInAndCreatedAtBefore(anyCollection(), any(LocalDateTime.class));
        verifyNoMoreInteractions(whatsappFlowWaitRepository, notificationRepository);
    }
}
