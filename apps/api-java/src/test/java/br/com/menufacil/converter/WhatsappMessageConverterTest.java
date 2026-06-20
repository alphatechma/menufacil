package br.com.menufacil.converter;

import br.com.menufacil.domain.enums.WhatsappMessageDirection;
import br.com.menufacil.domain.models.WhatsappMessage;
import br.com.menufacil.dto.WhatsappMessageResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {WhatsappMessageConverterImpl.class})
@ActiveProfiles("test")
class WhatsappMessageConverterTest {

    @Autowired
    private WhatsappMessageConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        UUID messageId = UUID.randomUUID();
        UUID instanceId = UUID.randomUUID();
        WhatsappMessage entity = new WhatsappMessage();
        entity.setId(messageId);
        entity.setInstanceId(instanceId);
        entity.setPhone("5511999999999");
        entity.setDirection(WhatsappMessageDirection.out);
        entity.setContent("Olá cliente");
        entity.setTemplateUsed("welcome");
        entity.setDelivered(true);

        // Act
        WhatsappMessageResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(messageId.toString());
        assertThat(response.getInstanceId()).isEqualTo(instanceId.toString());
        assertThat(response.getPhone()).isEqualTo("5511999999999");
        assertThat(response.getDirection()).isEqualTo(WhatsappMessageDirection.out);
        assertThat(response.getContent()).isEqualTo("Olá cliente");
        assertThat(response.getTemplateUsed()).isEqualTo("welcome");
        assertThat(response.isDelivered()).isTrue();
    }

    @Test
    void shouldConverterMensagemRecebidaSemTemplate() {
        // Arrange
        WhatsappMessage entity = new WhatsappMessage();
        entity.setId(UUID.randomUUID());
        entity.setInstanceId(UUID.randomUUID());
        entity.setPhone("5511888887777");
        entity.setDirection(WhatsappMessageDirection.in);
        entity.setContent("Oi, gostaria de fazer um pedido");
        entity.setDelivered(true);

        // Act
        WhatsappMessageResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getDirection()).isEqualTo(WhatsappMessageDirection.in);
        assertThat(response.getTemplateUsed()).isNull();
        assertThat(response.isDelivered()).isTrue();
    }

    @Test
    void shouldRetornarIdsNulosQuandoEntityTemIdsNulos() {
        // Arrange
        WhatsappMessage entity = new WhatsappMessage();
        entity.setPhone("5511777776666");
        entity.setDirection(WhatsappMessageDirection.out);
        entity.setContent("Mensagem sem ids");

        // Act
        WhatsappMessageResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isNull();
        assertThat(response.getInstanceId()).isNull();
        assertThat(response.getPhone()).isEqualTo("5511777776666");
    }
}
