package br.com.menufacil.converter;

import br.com.menufacil.domain.enums.NotificationChannel;
import br.com.menufacil.domain.enums.NotificationStatus;
import br.com.menufacil.domain.models.Notification;
import br.com.menufacil.dto.CreateNotificationRequest;
import br.com.menufacil.dto.NotificationResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {NotificationConverterImpl.class})
@ActiveProfiles("test")
class NotificationConverterTest {

    @Autowired
    private NotificationConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();
        LocalDateTime now = LocalDateTime.now();

        Notification entity = new Notification();
        entity.setId(id);
        entity.setOrderId(orderId);
        entity.setChannel(NotificationChannel.email);
        entity.setStatus(NotificationStatus.sent);
        entity.setSentAt(now);
        entity.setRecipient("cliente@example.com");
        entity.setContent("Seu pedido foi confirmado");

        // Act
        NotificationResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(id.toString());
        assertThat(response.getOrderId()).isEqualTo(orderId.toString());
        assertThat(response.getChannel()).isEqualTo("email");
        assertThat(response.getStatus()).isEqualTo("sent");
        assertThat(response.getSentAt()).isEqualTo(now);
        assertThat(response.getRecipient()).isEqualTo("cliente@example.com");
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        UUID orderId = UUID.randomUUID();
        CreateNotificationRequest request = new CreateNotificationRequest();
        request.setOrderId(orderId.toString());
        request.setChannel("whatsapp");
        request.setRecipient("+5511999999999");
        request.setContent("Mensagem de teste");

        // Act
        Notification entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getId()).isNull();
        assertThat(entity.getOrderId()).isEqualTo(orderId);
        assertThat(entity.getChannel()).isEqualTo(NotificationChannel.whatsapp);
        assertThat(entity.getRecipient()).isEqualTo("+5511999999999");
        assertThat(entity.getContent()).isEqualTo("Mensagem de teste");
    }

    @Test
    void shouldConverterRequestSemOrderIdParaEntity() {
        // Arrange
        CreateNotificationRequest request = new CreateNotificationRequest();
        request.setOrderId(null);
        request.setChannel("push");
        request.setRecipient("device-token-xyz");
        request.setContent("Push de teste");

        // Act
        Notification entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getOrderId()).isNull();
        assertThat(entity.getChannel()).isEqualTo(NotificationChannel.push);
        assertThat(entity.getRecipient()).isEqualTo("device-token-xyz");
    }
}
