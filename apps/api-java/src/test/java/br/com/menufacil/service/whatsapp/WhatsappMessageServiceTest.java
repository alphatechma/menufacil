package br.com.menufacil.service.whatsapp;

import br.com.menufacil.converter.WhatsappMessageConverter;
import br.com.menufacil.domain.enums.WhatsappMessageDirection;
import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.domain.models.WhatsappMessage;
import br.com.menufacil.dto.ConversationResponse;
import br.com.menufacil.dto.SendWhatsappMessageRequest;
import br.com.menufacil.dto.WhatsappMessageResponse;
import br.com.menufacil.repository.WhatsappInstanceRepository;
import br.com.menufacil.repository.WhatsappMessageRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WhatsappMessageServiceTest {

    @Mock private WhatsappMessageRepository whatsappMessageRepository;
    @Mock private WhatsappInstanceRepository whatsappInstanceRepository;
    @Mock private WhatsappMessageConverter whatsappMessageConverter;

    @InjectMocks
    private WhatsappMessageService whatsappMessageService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldListarConversasDoTenant() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();
        WhatsappMessage m1 = new WhatsappMessage();
        m1.setPhone("5511999991111");
        m1.setContent("Olá");
        WhatsappMessage m2 = new WhatsappMessage();
        m2.setPhone("5511999992222");
        m2.setContent("Bom dia");

        // simula createdAt via reflection - simples set via getter base não disponível,
        // mas o método usa getCreatedAt() que retorna null aqui - aceitável para teste
        when(whatsappMessageRepository.findDistinctPhoneByTenantId(tenantId))
                .thenReturn(List.of(m1, m2));

        // Act
        List<ConversationResponse> result = whatsappMessageService.listConversations(tenantId);

        // Assert
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getPhone()).isEqualTo("5511999991111");
        assertThat(result.get(0).getLastMessage()).isEqualTo("Olá");
        assertThat(result.get(0).getUnread()).isEqualTo(0L);
        assertThat(result.get(1).getPhone()).isEqualTo("5511999992222");
    }

    @Test
    void shouldRetornarMensagensDeUmaConversaPorTelefone() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        String phone = "5511999991111";
        WhatsappMessage m1 = new WhatsappMessage();
        WhatsappMessage m2 = new WhatsappMessage();
        WhatsappMessageResponse r1 = WhatsappMessageResponse.builder().phone(phone).content("primeira").build();
        WhatsappMessageResponse r2 = WhatsappMessageResponse.builder().phone(phone).content("segunda").build();

        when(whatsappMessageRepository.findByTenantIdAndPhoneOrderByCreatedAtDesc(tenantId, phone))
                .thenReturn(List.of(m1, m2));
        when(whatsappMessageConverter.toResponse(m1)).thenReturn(r1);
        when(whatsappMessageConverter.toResponse(m2)).thenReturn(r2);

        // Act
        List<WhatsappMessageResponse> result = whatsappMessageService.getMessagesByPhone(tenantId, phone);

        // Assert
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getContent()).isEqualTo("primeira");
        assertThat(result.get(1).getContent()).isEqualTo("segunda");
    }

    @Test
    void shouldEnviarMensagemDeTextoLivre() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        SendWhatsappMessageRequest request = new SendWhatsappMessageRequest();
        request.setInstanceName("instance-1");
        request.setPhone("5511999991111");
        request.setContent("Olá, sua entrega chegou!");

        WhatsappInstance instance = new WhatsappInstance();
        instance.setId(instanceId);
        instance.setInstanceName("instance-1");

        WhatsappMessage saved = new WhatsappMessage();
        saved.setId(UUID.randomUUID());
        WhatsappMessageResponse response = WhatsappMessageResponse.builder()
                .phone("5511999991111").content("Olá, sua entrega chegou!").build();

        when(whatsappInstanceRepository.findByInstanceNameAndTenantId("instance-1", tenantId))
                .thenReturn(Optional.of(instance));
        when(whatsappMessageRepository.save(any(WhatsappMessage.class))).thenReturn(saved);
        when(whatsappMessageConverter.toResponse(saved)).thenReturn(response);

        // Act
        WhatsappMessageResponse result = whatsappMessageService.sendMessage(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEqualTo("Olá, sua entrega chegou!");

        ArgumentCaptor<WhatsappMessage> captor = ArgumentCaptor.forClass(WhatsappMessage.class);
        verify(whatsappMessageRepository).save(captor.capture());
        WhatsappMessage captured = captor.getValue();
        assertThat(captured.getTenantId()).isEqualTo(tenantId);
        assertThat(captured.getInstanceId()).isEqualTo(instanceId);
        assertThat(captured.getDirection()).isEqualTo(WhatsappMessageDirection.out);
        assertThat(captured.isDelivered()).isTrue();
        assertThat(captured.getTemplateUsed()).isNull();
    }

    @Test
    void shouldEnviarMensagemComTemplate() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        SendWhatsappMessageRequest request = new SendWhatsappMessageRequest();
        request.setInstanceName("instance-1");
        request.setPhone("5511999992222");
        request.setContent("Pedido confirmado!");
        request.setTemplateName("order_confirmed");

        WhatsappInstance instance = new WhatsappInstance();
        instance.setId(UUID.randomUUID());
        instance.setInstanceName("instance-1");

        WhatsappMessage saved = new WhatsappMessage();
        WhatsappMessageResponse response = WhatsappMessageResponse.builder()
                .templateUsed("order_confirmed").build();

        when(whatsappInstanceRepository.findByInstanceNameAndTenantId("instance-1", tenantId))
                .thenReturn(Optional.of(instance));
        when(whatsappMessageRepository.save(any(WhatsappMessage.class))).thenReturn(saved);
        when(whatsappMessageConverter.toResponse(saved)).thenReturn(response);

        // Act
        WhatsappMessageResponse result = whatsappMessageService.sendMessage(tenantId, request);

        // Assert
        assertThat(result.getTemplateUsed()).isEqualTo("order_confirmed");

        ArgumentCaptor<WhatsappMessage> captor = ArgumentCaptor.forClass(WhatsappMessage.class);
        verify(whatsappMessageRepository).save(captor.capture());
        assertThat(captor.getValue().getTemplateUsed()).isEqualTo("order_confirmed");
    }

    @Test
    void shouldLancarExcecaoAoEnviarComInstanciaInexistente() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        SendWhatsappMessageRequest request = new SendWhatsappMessageRequest();
        request.setInstanceName("instance-inexistente");
        request.setPhone("5511999991111");
        request.setContent("teste");

        when(whatsappInstanceRepository.findByInstanceNameAndTenantId("instance-inexistente", tenantId))
                .thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> whatsappMessageService.sendMessage(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Instância do WhatsApp não encontrada");

        verify(whatsappMessageRepository, never()).save(any());
    }

    @Test
    void shouldReceberMensagemViaWebhookComoInbound() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        WhatsappInstance instance = new WhatsappInstance();
        instance.setId(instanceId);
        instance.setInstanceName("instance-1");

        WhatsappMessage saved = new WhatsappMessage();
        WhatsappMessageResponse response = WhatsappMessageResponse.builder()
                .phone("5511777776666").direction(WhatsappMessageDirection.in).build();

        when(whatsappInstanceRepository.findByInstanceNameAndTenantId("instance-1", tenantId))
                .thenReturn(Optional.of(instance));
        when(whatsappMessageRepository.save(any(WhatsappMessage.class))).thenReturn(saved);
        when(whatsappMessageConverter.toResponse(saved)).thenReturn(response);

        // Act
        WhatsappMessageResponse result = whatsappMessageService.receiveMessage(
                tenantId, "instance-1", "5511777776666", "oi");

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getDirection()).isEqualTo(WhatsappMessageDirection.in);

        ArgumentCaptor<WhatsappMessage> captor = ArgumentCaptor.forClass(WhatsappMessage.class);
        verify(whatsappMessageRepository).save(captor.capture());
        WhatsappMessage captured = captor.getValue();
        assertThat(captured.getTenantId()).isEqualTo(tenantId);
        assertThat(captured.getInstanceId()).isEqualTo(instanceId);
        assertThat(captured.getPhone()).isEqualTo("5511777776666");
        assertThat(captured.getDirection()).isEqualTo(WhatsappMessageDirection.in);
        assertThat(captured.getContent()).isEqualTo("oi");
        assertThat(captured.isDelivered()).isTrue();
    }
}
