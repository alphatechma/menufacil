package br.com.menufacil.service.whatsapp;

import br.com.menufacil.domain.enums.WhatsappFlowTriggerType;
import br.com.menufacil.domain.models.WhatsappFlow;
import br.com.menufacil.domain.models.WhatsappFlowExecution;
import br.com.menufacil.repository.WhatsappFlowExecutionRepository;
import br.com.menufacil.repository.WhatsappFlowRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FlowEngineServiceTest {

    @Mock private WhatsappFlowRepository whatsappFlowRepository;
    @Mock private WhatsappFlowExecutionRepository whatsappFlowExecutionRepository;
    @Mock private WhatsappMessageService whatsappMessageService;

    @InjectMocks
    private FlowEngineService flowEngineService;

    private UUID tenantId;
    private UUID flowId;
    private String phone;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
        flowId = UUID.randomUUID();
        phone = "5511999999999";

        when(whatsappFlowExecutionRepository.save(any(WhatsappFlowExecution.class)))
                .thenAnswer(invocation -> {
                    WhatsappFlowExecution exec = invocation.getArgument(0);
                    if (exec.getId() == null) {
                        exec.setId(UUID.randomUUID());
                    }
                    return exec;
                });
    }

    @Test
    void shouldIniciarExecucaoDeFluxo() {
        // Arrange
        WhatsappFlow flow = buildFlow(
                "[{\"id\":\"n1\",\"type\":\"message\",\"config\":{\"content\":\"Bem vindo\"}}]",
                "[]");
        when(whatsappFlowRepository.findById(flowId)).thenReturn(Optional.of(flow));

        // Act
        WhatsappFlowExecution execution = flowEngineService.startExecution(flowId, tenantId, phone);

        // Assert
        assertThat(execution).isNotNull();
        assertThat(execution.getFlowId()).isEqualTo(flowId);
        assertThat(execution.getPhone()).isEqualTo(phone);
        assertThat(execution.getTenantId()).isEqualTo(tenantId);
        verify(whatsappMessageService).sendOutbound(tenantId, phone, "Bem vindo");
    }

    @Test
    void shouldEnviarMensagemEAvancar() {
        // Arrange — fluxo com 2 nodes message ligados
        WhatsappFlow flow = buildFlow(
                "[{\"id\":\"n1\",\"type\":\"message\",\"config\":{\"content\":\"Olá\"}},"
                        + "{\"id\":\"n2\",\"type\":\"message\",\"config\":{\"content\":\"Tudo bem?\"}}]",
                "[{\"source\":\"n1\",\"target\":\"n2\"}]");
        when(whatsappFlowRepository.findById(flowId)).thenReturn(Optional.of(flow));

        // Act
        WhatsappFlowExecution execution = flowEngineService.startExecution(flowId, tenantId, phone);

        // Assert
        assertThat(execution.isActive()).isFalse();
        assertThat(execution.getEndedAt()).isNotNull();
        verify(whatsappMessageService).sendOutbound(tenantId, phone, "Olá");
        verify(whatsappMessageService).sendOutbound(tenantId, phone, "Tudo bem?");
    }

    @Test
    void shouldPararEmNoQuestion() {
        // Arrange — fluxo: message -> question (deve parar no question)
        WhatsappFlow flow = buildFlow(
                "[{\"id\":\"n1\",\"type\":\"message\",\"config\":{\"content\":\"Oi\"}},"
                        + "{\"id\":\"n2\",\"type\":\"question\",\"config\":{\"content\":\"Qual seu nome?\"}}]",
                "[{\"source\":\"n1\",\"target\":\"n2\"}]");
        when(whatsappFlowRepository.findById(flowId)).thenReturn(Optional.of(flow));

        // Act
        WhatsappFlowExecution execution = flowEngineService.startExecution(flowId, tenantId, phone);

        // Assert
        assertThat(execution.isActive()).isTrue();
        assertThat(execution.getEndedAt()).isNull();
        assertThat(execution.getCurrentNodeId()).isEqualTo("n2");
        verify(whatsappMessageService).sendOutbound(tenantId, phone, "Oi");
        verify(whatsappMessageService).sendOutbound(tenantId, phone, "Qual seu nome?");
    }

    @Test
    void shouldRetomarExecucaoComResposta() {
        // Arrange — execução existente parada no question n2; ao avançar deve ir pra n3 (message)
        UUID executionId = UUID.randomUUID();
        WhatsappFlowExecution existing = new WhatsappFlowExecution();
        existing.setId(executionId);
        existing.setTenantId(tenantId);
        existing.setFlowId(flowId);
        existing.setPhone(phone);
        existing.setActive(true);
        existing.setStartedAt(LocalDateTime.now());
        existing.setCurrentNodeId("n2");
        existing.setExecutionState("{}");

        WhatsappFlow flow = buildFlow(
                "[{\"id\":\"n1\",\"type\":\"message\",\"config\":{\"content\":\"Oi\"}},"
                        + "{\"id\":\"n2\",\"type\":\"question\",\"config\":{\"content\":\"Nome?\"}},"
                        + "{\"id\":\"n3\",\"type\":\"message\",\"config\":{\"content\":\"Obrigado\"}}]",
                "[{\"source\":\"n1\",\"target\":\"n2\"},{\"source\":\"n2\",\"target\":\"n3\"}]");

        when(whatsappFlowExecutionRepository.findById(executionId)).thenReturn(Optional.of(existing));
        when(whatsappFlowRepository.findById(flowId)).thenReturn(Optional.of(flow));

        // Act
        WhatsappFlowExecution updated = flowEngineService.advanceExecution(executionId, "João");

        // Assert
        assertThat(updated.isActive()).isFalse();
        assertThat(updated.getExecutionState()).contains("João");
        verify(whatsappMessageService).sendOutbound(tenantId, phone, "Obrigado");
    }

    @Test
    void shouldAvaliarCondicaoVerdadeira() {
        // Arrange — condition expr "n1 == sim", state com n1=sim;
        // edges com sourceHandle/condition true vai pra n2 (message)
        UUID executionId = UUID.randomUUID();
        WhatsappFlowExecution existing = new WhatsappFlowExecution();
        existing.setId(executionId);
        existing.setTenantId(tenantId);
        existing.setFlowId(flowId);
        existing.setPhone(phone);
        existing.setActive(true);
        existing.setStartedAt(LocalDateTime.now());
        existing.setCurrentNodeId("n1");
        existing.setExecutionState("{}");

        WhatsappFlow flow = buildFlow(
                "[{\"id\":\"n1\",\"type\":\"question\",\"config\":{\"content\":\"Confirma?\"}},"
                        + "{\"id\":\"cond\",\"type\":\"condition\",\"config\":{\"expression\":\"n1 == sim\"}},"
                        + "{\"id\":\"ok\",\"type\":\"message\",\"config\":{\"content\":\"Confirmado!\"}},"
                        + "{\"id\":\"no\",\"type\":\"message\",\"config\":{\"content\":\"Cancelado\"}}]",
                "[{\"source\":\"n1\",\"target\":\"cond\"},"
                        + "{\"source\":\"cond\",\"target\":\"ok\",\"condition\":\"true\"},"
                        + "{\"source\":\"cond\",\"target\":\"no\",\"condition\":\"false\"}]");

        when(whatsappFlowExecutionRepository.findById(executionId)).thenReturn(Optional.of(existing));
        when(whatsappFlowRepository.findById(flowId)).thenReturn(Optional.of(flow));

        // Act
        WhatsappFlowExecution updated = flowEngineService.advanceExecution(executionId, "sim");

        // Assert
        verify(whatsappMessageService).sendOutbound(tenantId, phone, "Confirmado!");
        verify(whatsappMessageService, never()).sendOutbound(tenantId, phone, "Cancelado");
        assertThat(updated.isActive()).isFalse();
    }

    @Test
    void shouldEncerrarExecucao() {
        // Arrange
        UUID executionId = UUID.randomUUID();
        WhatsappFlowExecution existing = new WhatsappFlowExecution();
        existing.setId(executionId);
        existing.setTenantId(tenantId);
        existing.setFlowId(flowId);
        existing.setPhone(phone);
        existing.setActive(true);
        existing.setStartedAt(LocalDateTime.now());
        existing.setCurrentNodeId("n1");
        existing.setExecutionState("{}");

        when(whatsappFlowExecutionRepository.findById(executionId)).thenReturn(Optional.of(existing));

        // Act
        WhatsappFlowExecution ended = flowEngineService.endExecution(executionId, "cancelado pelo operador");

        // Assert
        assertThat(ended.isActive()).isFalse();
        assertThat(ended.getEndedAt()).isNotNull();
    }

    @Test
    void shouldIniciarExecucaoQuandoMensagemMatchKeyword() {
        // Arrange — sem execução ativa; flow com triggerType=keyword e triggerConfig contendo "menu"
        when(whatsappFlowExecutionRepository
                .findFirstByTenantIdAndPhoneAndActiveTrueOrderByStartedAtDesc(tenantId, phone))
                .thenReturn(Optional.empty());

        WhatsappFlow flow = buildFlow(
                "[{\"id\":\"n1\",\"type\":\"message\",\"config\":{\"content\":\"Cardápio\"}}]",
                "[]");
        flow.setTriggerType(WhatsappFlowTriggerType.keyword);
        flow.setTriggerConfig("{\"keywords\":[\"menu\",\"cardapio\"]}");

        when(whatsappFlowRepository
                .findByTenantIdAndTriggerTypeAndActiveTrueOrderByPriorityDesc(
                        tenantId, WhatsappFlowTriggerType.keyword))
                .thenReturn(List.of(flow));
        when(whatsappFlowRepository.findById(flowId)).thenReturn(Optional.of(flow));

        // Act
        Optional<WhatsappFlowExecution> result = flowEngineService.processIncomingMessage(
                tenantId, phone, "Quero ver o menu");

        // Assert
        assertThat(result).isPresent();
        verify(whatsappMessageService).sendOutbound(tenantId, phone, "Cardápio");
    }

    private WhatsappFlow buildFlow(String nodesJson, String edgesJson) {
        WhatsappFlow flow = new WhatsappFlow();
        flow.setId(flowId);
        flow.setTenantId(tenantId);
        flow.setName("Fluxo Teste");
        flow.setTriggerType(WhatsappFlowTriggerType.manual);
        flow.setActive(true);
        flow.setNodes(nodesJson);
        flow.setEdges(edgesJson);
        return flow;
    }
}
