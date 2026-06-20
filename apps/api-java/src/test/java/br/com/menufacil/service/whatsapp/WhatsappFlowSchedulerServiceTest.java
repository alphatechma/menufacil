package br.com.menufacil.service.whatsapp;

import br.com.menufacil.domain.enums.WhatsappFlowTriggerType;
import br.com.menufacil.domain.models.WhatsappFlow;
import br.com.menufacil.repository.WhatsappFlowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappFlowSchedulerServiceTest {

    @Mock private WhatsappFlowRepository whatsappFlowRepository;
    @Mock private FlowEngineService flowEngineService;

    @InjectMocks
    private WhatsappFlowSchedulerService schedulerService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldNaoFazerNadaQuandoNaoHaFluxosScheduled() {
        // Arrange
        when(whatsappFlowRepository.findAll()).thenReturn(List.of());

        // Act
        schedulerService.processScheduledFlows();

        // Assert
        verify(flowEngineService, never()).startExecution(any(), any(), anyString());
        verify(whatsappFlowRepository, never()).save(any());
    }

    @Test
    void shouldIgnorarFluxosInativos() {
        // Arrange
        WhatsappFlow inativo = buildFlow(WhatsappFlowTriggerType.scheduled, false, null);
        WhatsappFlow outroTipo = buildFlow(WhatsappFlowTriggerType.keyword, true, null);
        when(whatsappFlowRepository.findAll()).thenReturn(List.of(inativo, outroTipo));

        // Act
        schedulerService.processScheduledFlows();

        // Assert
        verify(flowEngineService, never()).startExecution(any(), any(), anyString());
        verify(whatsappFlowRepository, never()).save(any());
    }

    @Test
    void shouldProcessarFluxoScheduledAtivoQueNuncaRodou() {
        // Arrange
        WhatsappFlow flow = buildFlow(WhatsappFlowTriggerType.scheduled, true, null);
        when(whatsappFlowRepository.findAll()).thenReturn(List.of(flow));

        // Act
        schedulerService.processScheduledFlows();

        // Assert: candidatos = [] (TODO), então não chama startExecution
        // mas DEVE persistir lastRunAt no triggerConfig.
        ArgumentCaptor<WhatsappFlow> captor = ArgumentCaptor.forClass(WhatsappFlow.class);
        verify(whatsappFlowRepository, times(1)).save(captor.capture());
        WhatsappFlow saved = captor.getValue();
        assertThat(saved.getTriggerConfig()).contains("lastRunAt");
    }

    @Test
    void shouldNaoDispararFluxoForaDaJanelaMinima() {
        // Arrange: lastRunAt = agora (não passou 1h)
        String triggerConfig = "{\"lastRunAt\":\"" + LocalDateTime.now().toString() + "\"}";
        WhatsappFlow flow = buildFlow(WhatsappFlowTriggerType.scheduled, true, triggerConfig);
        when(whatsappFlowRepository.findAll()).thenReturn(List.of(flow));

        // Act
        schedulerService.processScheduledFlows();

        // Assert: não persiste e não dispara
        verify(flowEngineService, never()).startExecution(any(), any(), anyString());
        verify(whatsappFlowRepository, never()).save(any());
    }

    @Test
    void shouldDispararFluxoQuandoPassouJanelaMinima() {
        // Arrange: lastRunAt = 2h atrás
        String triggerConfig = "{\"lastRunAt\":\""
                + LocalDateTime.now().minusHours(2).toString() + "\"}";
        WhatsappFlow flow = buildFlow(WhatsappFlowTriggerType.scheduled, true, triggerConfig);
        when(whatsappFlowRepository.findAll()).thenReturn(List.of(flow));

        // Act
        schedulerService.processScheduledFlows();

        // Assert: atualiza lastRunAt
        ArgumentCaptor<WhatsappFlow> captor = ArgumentCaptor.forClass(WhatsappFlow.class);
        verify(whatsappFlowRepository, times(1)).save(captor.capture());
        WhatsappFlow saved = captor.getValue();
        assertThat(saved.getTriggerConfig()).contains("lastRunAt");
    }

    @Test
    void shouldContinuarProcessandoOutrosFluxosQuandoUmFalha() {
        // Arrange
        WhatsappFlow ok = buildFlow(WhatsappFlowTriggerType.scheduled, true, null);
        WhatsappFlow falha = buildFlow(WhatsappFlowTriggerType.scheduled, true, "json invalido!!!");
        when(whatsappFlowRepository.findAll()).thenReturn(List.of(falha, ok));

        // Act + Assert: não deve lançar exceção
        schedulerService.processScheduledFlows();

        // Ambos foram processados (falha pq triggerConfig invalido cai em parse default = HashMap vazio,
        // shouldTrigger=true, save é chamado)
        verify(whatsappFlowRepository, times(2)).save(any(WhatsappFlow.class));
    }

    // --- helpers -------------------------------------------------------------

    private WhatsappFlow buildFlow(WhatsappFlowTriggerType type, boolean active, String triggerConfig) {
        WhatsappFlow flow = new WhatsappFlow();
        flow.setId(UUID.randomUUID());
        flow.setTenantId(UUID.randomUUID());
        flow.setName("Fluxo teste");
        flow.setTriggerType(type);
        flow.setActive(active);
        flow.setTriggerConfig(triggerConfig);
        flow.setNodes("[]");
        flow.setEdges("[]");
        return flow;
    }
}
