package br.com.menufacil.service.whatsapp;

import br.com.menufacil.domain.models.WhatsappFlowExecution;
import br.com.menufacil.domain.models.WhatsappFlowWait;
import br.com.menufacil.repository.WhatsappFlowExecutionRepository;
import br.com.menufacil.repository.WhatsappFlowWaitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappFlowWaitWorkerTest {

    @Mock private WhatsappFlowWaitRepository whatsappFlowWaitRepository;
    @Mock private WhatsappFlowExecutionRepository whatsappFlowExecutionRepository;
    @Mock private FlowEngineService flowEngineService;

    @InjectMocks
    private WhatsappFlowWaitWorker worker;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldProcessarWaitPendenteEChamarEngine() {
        // Arrange
        UUID executionId = UUID.randomUUID();
        WhatsappFlowWait wait = buildWait(executionId, "n2", "n3",
                LocalDateTime.now().minusSeconds(1), false);

        WhatsappFlowExecution execution = buildExecution(executionId, true);

        when(whatsappFlowWaitRepository
                .findByProcessedFalseAndResumeAtLessThanEqualOrderByResumeAtAsc(any(LocalDateTime.class)))
                .thenReturn(List.of(wait));
        when(whatsappFlowExecutionRepository.findById(executionId)).thenReturn(Optional.of(execution));

        // Act
        worker.processPendingWaits();

        // Assert
        verify(flowEngineService).resumeFromNode(executionId, "n3");
        assertThat(wait.isProcessed()).isTrue();
        assertThat(wait.getProcessedAt()).isNotNull();
    }

    @Test
    void shouldNaoFazerNadaQuandoNaoHaWaitsPendentes() {
        // Arrange
        when(whatsappFlowWaitRepository
                .findByProcessedFalseAndResumeAtLessThanEqualOrderByResumeAtAsc(any(LocalDateTime.class)))
                .thenReturn(List.of());

        // Act
        worker.processPendingWaits();

        // Assert
        verify(whatsappFlowWaitRepository, never()).save(any(WhatsappFlowWait.class));
        verify(flowEngineService, never()).resumeFromNode(any(UUID.class), anyString());
    }

    @Test
    void shouldIgnorarExecucaoInativaMasMarcarWaitComoProcessado() {
        // Arrange
        UUID executionId = UUID.randomUUID();
        WhatsappFlowWait wait = buildWait(executionId, "n2", "n3",
                LocalDateTime.now().minusSeconds(1), false);

        WhatsappFlowExecution inactive = buildExecution(executionId, false);

        when(whatsappFlowWaitRepository
                .findByProcessedFalseAndResumeAtLessThanEqualOrderByResumeAtAsc(any(LocalDateTime.class)))
                .thenReturn(List.of(wait));
        when(whatsappFlowExecutionRepository.findById(executionId)).thenReturn(Optional.of(inactive));

        // Act
        worker.processPendingWaits();

        // Assert — engine NÃO é chamado, mas wait é marcado processed (idempotência).
        verify(flowEngineService, never()).resumeFromNode(any(UUID.class), anyString());
        assertThat(wait.isProcessed()).isTrue();
        assertThat(wait.getProcessedAt()).isNotNull();
    }

    @Test
    void shouldIgnorarQuandoExecucaoNaoExiste() {
        // Arrange
        UUID executionId = UUID.randomUUID();
        WhatsappFlowWait wait = buildWait(executionId, "n2", "n3",
                LocalDateTime.now().minusSeconds(1), false);

        when(whatsappFlowWaitRepository
                .findByProcessedFalseAndResumeAtLessThanEqualOrderByResumeAtAsc(any(LocalDateTime.class)))
                .thenReturn(List.of(wait));
        when(whatsappFlowExecutionRepository.findById(executionId)).thenReturn(Optional.empty());

        // Act
        worker.processPendingWaits();

        // Assert — engine não é chamado e wait fica marcado processed.
        verify(flowEngineService, never()).resumeFromNode(any(UUID.class), anyString());
        assertThat(wait.isProcessed()).isTrue();
    }

    @Test
    void shouldMarcarProcessadoAntesDeChamarEngine() {
        // Arrange — garante a ordem: save(wait com processed=true) ANTES de resumeFromNode().
        UUID executionId = UUID.randomUUID();
        WhatsappFlowWait wait = buildWait(executionId, "n2", "n3",
                LocalDateTime.now().minusSeconds(1), false);
        WhatsappFlowExecution execution = buildExecution(executionId, true);

        when(whatsappFlowWaitRepository
                .findByProcessedFalseAndResumeAtLessThanEqualOrderByResumeAtAsc(any(LocalDateTime.class)))
                .thenReturn(List.of(wait));
        when(whatsappFlowExecutionRepository.findById(executionId)).thenReturn(Optional.of(execution));

        // Act
        worker.processPendingWaits();

        // Assert — primeiro save(processed=true), depois engine.
        InOrder order = inOrder(whatsappFlowWaitRepository, flowEngineService);
        ArgumentCaptor<WhatsappFlowWait> captor = ArgumentCaptor.forClass(WhatsappFlowWait.class);
        order.verify(whatsappFlowWaitRepository).save(captor.capture());
        order.verify(flowEngineService).resumeFromNode(executionId, "n3");

        WhatsappFlowWait saved = captor.getValue();
        assertThat(saved.isProcessed()).isTrue();
        assertThat(saved.getProcessedAt()).isNotNull();
    }

    @Test
    void shouldContinuarProcessandoMesmoQuandoEngineLancaErro() {
        // Arrange — wait1 falha no engine, wait2 deve ainda assim ser processado.
        UUID exec1 = UUID.randomUUID();
        UUID exec2 = UUID.randomUUID();
        WhatsappFlowWait wait1 = buildWait(exec1, "a", "b",
                LocalDateTime.now().minusSeconds(2), false);
        WhatsappFlowWait wait2 = buildWait(exec2, "x", "y",
                LocalDateTime.now().minusSeconds(1), false);

        when(whatsappFlowWaitRepository
                .findByProcessedFalseAndResumeAtLessThanEqualOrderByResumeAtAsc(any(LocalDateTime.class)))
                .thenReturn(List.of(wait1, wait2));
        when(whatsappFlowExecutionRepository.findById(exec1))
                .thenReturn(Optional.of(buildExecution(exec1, true)));
        when(whatsappFlowExecutionRepository.findById(exec2))
                .thenReturn(Optional.of(buildExecution(exec2, true)));
        when(flowEngineService.resumeFromNode(eq(exec1), anyString()))
                .thenThrow(new RuntimeException("boom"));

        // Act
        worker.processPendingWaits();

        // Assert — wait2 também foi processado.
        verify(flowEngineService).resumeFromNode(exec1, "b");
        verify(flowEngineService).resumeFromNode(exec2, "y");
        assertThat(wait1.isProcessed()).isTrue();
        assertThat(wait2.isProcessed()).isTrue();
    }

    // --- helpers -------------------------------------------------------------

    private WhatsappFlowWait buildWait(UUID executionId, String nodeId, String nextNodeId,
                                       LocalDateTime resumeAt, boolean processed) {
        WhatsappFlowWait wait = new WhatsappFlowWait();
        wait.setId(UUID.randomUUID());
        wait.setTenantId(UUID.randomUUID());
        wait.setExecutionId(executionId);
        wait.setNodeId(nodeId);
        wait.setNextNodeId(nextNodeId);
        wait.setResumeAt(resumeAt);
        wait.setProcessed(processed);
        return wait;
    }

    private WhatsappFlowExecution buildExecution(UUID executionId, boolean active) {
        WhatsappFlowExecution execution = new WhatsappFlowExecution();
        execution.setId(executionId);
        execution.setTenantId(UUID.randomUUID());
        execution.setFlowId(UUID.randomUUID());
        execution.setPhone("5511999999999");
        execution.setActive(active);
        execution.setStartedAt(LocalDateTime.now());
        execution.setExecutionState("{}");
        return execution;
    }
}
