package br.com.menufacil.controller.whatsapp;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.domain.enums.WhatsappMessageDirection;
import br.com.menufacil.dto.ConversationResponse;
import br.com.menufacil.dto.SendWhatsappMessageRequest;
import br.com.menufacil.dto.WhatsappMessageResponse;
import br.com.menufacil.service.whatsapp.WhatsappMessageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class WhatsappMessageControllerTest {

    @Mock private WhatsappMessageService whatsappMessageService;

    @InjectMocks
    private WhatsappMessageController whatsappMessageController;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenant("test-tenant", tenantId.toString());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldListarConversasDoTenant() {
        // Arrange
        ConversationResponse conv = ConversationResponse.builder()
                .phone("5511999991111")
                .lastMessage("Olá")
                .lastMessageAt(LocalDateTime.now())
                .unread(0L)
                .build();
        when(whatsappMessageService.listConversations(tenantId)).thenReturn(List.of(conv));

        // Act
        ResponseEntity<List<ConversationResponse>> response = whatsappMessageController.listConversations();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull().hasSize(1);
        assertThat(response.getBody().get(0).getPhone()).isEqualTo("5511999991111");
    }

    @Test
    void shouldRetornarMensagensDeUmaConversa() {
        // Arrange
        String phone = "5511999991111";
        WhatsappMessageResponse msg = WhatsappMessageResponse.builder()
                .phone(phone)
                .content("oi")
                .direction(WhatsappMessageDirection.in)
                .build();
        when(whatsappMessageService.getMessagesByPhone(tenantId, phone)).thenReturn(List.of(msg));

        // Act
        ResponseEntity<List<WhatsappMessageResponse>> response =
                whatsappMessageController.getMessagesByPhone(phone);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull().hasSize(1);
        assertThat(response.getBody().get(0).getContent()).isEqualTo("oi");
    }

    @Test
    void shouldEnviarMensagemERetornarCreated() {
        // Arrange
        SendWhatsappMessageRequest request = new SendWhatsappMessageRequest();
        request.setInstanceName("instance-1");
        request.setPhone("5511999992222");
        request.setContent("Pedido confirmado");

        WhatsappMessageResponse created = WhatsappMessageResponse.builder()
                .id(UUID.randomUUID().toString())
                .phone("5511999992222")
                .content("Pedido confirmado")
                .direction(WhatsappMessageDirection.out)
                .delivered(true)
                .build();

        when(whatsappMessageService.sendMessage(eq(tenantId), any(SendWhatsappMessageRequest.class)))
                .thenReturn(created);

        // Act
        ResponseEntity<WhatsappMessageResponse> response = whatsappMessageController.sendMessage(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getContent()).isEqualTo("Pedido confirmado");
        assertThat(response.getBody().isDelivered()).isTrue();
    }
}
