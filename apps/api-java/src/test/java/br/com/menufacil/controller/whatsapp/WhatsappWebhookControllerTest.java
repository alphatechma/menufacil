package br.com.menufacil.controller.whatsapp;

import br.com.menufacil.domain.enums.WhatsappInstanceStatus;
import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.repository.WhatsappInstanceRepository;
import br.com.menufacil.service.whatsapp.FlowEngineService;
import br.com.menufacil.service.whatsapp.WhatsappMessageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappWebhookControllerTest {

    @Mock private WhatsappInstanceRepository whatsappInstanceRepository;
    @Mock private WhatsappMessageService whatsappMessageService;
    @Mock private FlowEngineService flowEngineService;

    @InjectMocks
    private WhatsappWebhookController webhookController;

    private final UUID tenantId = UUID.randomUUID();
    private final String instanceName = "tenant-abc";

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldDispararFlowEngineQuandoReceberMessagesUpsert() {
        // Arrange
        WhatsappInstance instance = new WhatsappInstance();
        instance.setId(UUID.randomUUID());
        instance.setTenantId(tenantId);
        instance.setInstanceName(instanceName);
        when(whatsappInstanceRepository.findByInstanceName(instanceName))
                .thenReturn(Optional.of(instance));

        Map<String, Object> payload = buildMessagesUpsertPayload(
                instanceName, "5511999998888@s.whatsapp.net", "Oi quero pedir", false);

        // Act
        ResponseEntity<Map<String, Object>> response = webhookController.handleWebhook(payload, null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("ok", true);

        verify(whatsappMessageService).receiveMessage(
                eq(tenantId), eq(instanceName), eq("5511999998888"), eq("Oi quero pedir"));
        verify(flowEngineService).processIncomingMessageAsync(
                eq(tenantId), eq("5511999998888"), eq("Oi quero pedir"));
    }

    @Test
    void shouldIgnorarMensagemEnviadaPorNosMesmos() {
        // Arrange
        WhatsappInstance instance = new WhatsappInstance();
        instance.setTenantId(tenantId);
        instance.setInstanceName(instanceName);
        when(whatsappInstanceRepository.findByInstanceName(instanceName))
                .thenReturn(Optional.of(instance));

        Map<String, Object> payload = buildMessagesUpsertPayload(
                instanceName, "5511999998888@s.whatsapp.net", "echo", true);

        // Act
        ResponseEntity<Map<String, Object>> response = webhookController.handleWebhook(payload, null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(whatsappMessageService, never()).receiveMessage(any(), anyString(), anyString(), anyString());
        verify(flowEngineService, never()).processIncomingMessageAsync(any(), anyString(), anyString());
    }

    @Test
    void shouldAtualizarStatusDaInstanciaQuandoReceberConnectionUpdate() {
        // Arrange
        WhatsappInstance instance = new WhatsappInstance();
        instance.setId(UUID.randomUUID());
        instance.setTenantId(tenantId);
        instance.setInstanceName(instanceName);
        instance.setStatus(WhatsappInstanceStatus.connecting);

        when(whatsappInstanceRepository.findByInstanceName(instanceName))
                .thenReturn(Optional.of(instance));

        Map<String, Object> payload = new HashMap<>();
        payload.put("event", "connection.update");
        payload.put("instance", instanceName);
        Map<String, Object> data = new HashMap<>();
        data.put("state", "open");
        data.put("wid", "5511988887777");
        payload.put("data", data);

        // Act
        ResponseEntity<Map<String, Object>> response = webhookController.handleWebhook(payload, null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        ArgumentCaptor<WhatsappInstance> captor = ArgumentCaptor.forClass(WhatsappInstance.class);
        verify(whatsappInstanceRepository).save(captor.capture());
        WhatsappInstance saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(WhatsappInstanceStatus.connected);
        assertThat(saved.getPhoneNumber()).isEqualTo("5511988887777");
    }

    @Test
    void shouldRetornar200MesmoComPayloadInvalido() {
        // Arrange
        Map<String, Object> payload = new HashMap<>();
        payload.put("event", "messages.upsert");
        // sem instance, sem data

        // Act
        ResponseEntity<Map<String, Object>> response = webhookController.handleWebhook(payload, null);

        // Assert: webhook NUNCA pode retornar 5xx
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("ok", true);
        verify(flowEngineService, never()).processIncomingMessageAsync(any(), anyString(), anyString());
    }

    @Test
    void shouldRetornar200ComPayloadNulo() {
        // Arrange + Act
        ResponseEntity<Map<String, Object>> response = webhookController.handleWebhook(null, null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("ok", true);
    }

    @Test
    void shouldIgnorarEventoQuandoInstanciaNaoEncontrada() {
        // Arrange
        when(whatsappInstanceRepository.findByInstanceName("desconhecida"))
                .thenReturn(Optional.empty());

        Map<String, Object> payload = buildMessagesUpsertPayload(
                "desconhecida", "5511999998888@s.whatsapp.net", "oi", false);

        // Act
        ResponseEntity<Map<String, Object>> response = webhookController.handleWebhook(payload, null);

        // Assert: sem tenant resolvido, retorna ok mas não chama services
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(flowEngineService, never()).processIncomingMessageAsync(any(), anyString(), anyString());
        verify(whatsappMessageService, never()).receiveMessage(any(), anyString(), anyString(), anyString());
    }

    @Test
    void shouldRetornar200QuandoServicoLancaExcecao() {
        // Arrange
        WhatsappInstance instance = new WhatsappInstance();
        instance.setTenantId(tenantId);
        instance.setInstanceName(instanceName);
        when(whatsappInstanceRepository.findByInstanceName(instanceName))
                .thenReturn(Optional.of(instance));

        doThrow(new RuntimeException("erro interno simulado"))
                .when(flowEngineService).processIncomingMessageAsync(any(), anyString(), anyString());

        Map<String, Object> payload = buildMessagesUpsertPayload(
                instanceName, "5511999998888@s.whatsapp.net", "boom", false);

        // Act
        ResponseEntity<Map<String, Object>> response = webhookController.handleWebhook(payload, null);

        // Assert: mesmo com exceção interna, retorna 200 pra Evolution não retentar
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsEntry("ok", true);
        verify(flowEngineService, times(1)).processIncomingMessageAsync(any(), anyString(), anyString());
    }

    // --- helpers -------------------------------------------------------------

    private Map<String, Object> buildMessagesUpsertPayload(String instance, String remoteJid,
                                                           String content, boolean fromMe) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("event", "messages.upsert");
        payload.put("instance", instance);

        Map<String, Object> data = new HashMap<>();
        Map<String, Object> key = new HashMap<>();
        key.put("fromMe", fromMe);
        key.put("remoteJid", remoteJid);
        data.put("key", key);

        Map<String, Object> message = new HashMap<>();
        message.put("conversation", content);
        data.put("message", message);

        payload.put("data", data);
        return payload;
    }
}
