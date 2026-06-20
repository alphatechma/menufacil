package br.com.menufacil.converter;

import br.com.menufacil.domain.models.WhatsappMessageTemplate;
import br.com.menufacil.dto.CreateWhatsappTemplateRequest;
import br.com.menufacil.dto.WhatsappTemplateResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {WhatsappTemplateConverterImpl.class})
@ActiveProfiles("test")
class WhatsappTemplateConverterTest {

    @Autowired
    private WhatsappTemplateConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        WhatsappMessageTemplate entity = new WhatsappMessageTemplate();
        entity.setId(UUID.randomUUID());
        entity.setName("Boas-vindas");
        entity.setTemplateContent("Olá {{customer_name}}!");
        entity.setVariables("{\"customer_name\":\"string\"}");

        // Act
        WhatsappTemplateResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(entity.getId().toString());
        assertThat(response.getName()).isEqualTo("Boas-vindas");
        assertThat(response.getTemplateContent()).isEqualTo("Olá {{customer_name}}!");
        assertThat(response.getVariables()).isEqualTo("{\"customer_name\":\"string\"}");
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        CreateWhatsappTemplateRequest request = new CreateWhatsappTemplateRequest();
        request.setName("Pedido Confirmado");
        request.setTemplateContent("Pedido #{{order_number}} confirmado");
        request.setVariables("{\"order_number\":\"string\"}");

        // Act
        WhatsappMessageTemplate entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getId()).isNull();
        assertThat(entity.getTenantId()).isNull();
        assertThat(entity.getName()).isEqualTo("Pedido Confirmado");
        assertThat(entity.getTemplateContent()).isEqualTo("Pedido #{{order_number}} confirmado");
        assertThat(entity.getVariables()).isEqualTo("{\"order_number\":\"string\"}");
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        UUID originalId = UUID.randomUUID();
        UUID originalTenantId = UUID.randomUUID();
        WhatsappMessageTemplate entity = new WhatsappMessageTemplate();
        entity.setId(originalId);
        entity.setTenantId(originalTenantId);
        entity.setName("Antigo");
        entity.setTemplateContent("Conteudo antigo");

        CreateWhatsappTemplateRequest request = new CreateWhatsappTemplateRequest();
        request.setName("Novo");
        request.setTemplateContent("Conteudo novo");
        request.setVariables("{\"x\":\"y\"}");

        // Act
        converter.updateFromRequest(request, entity);

        // Assert
        assertThat(entity.getId()).isEqualTo(originalId);
        assertThat(entity.getTenantId()).isEqualTo(originalTenantId);
        assertThat(entity.getName()).isEqualTo("Novo");
        assertThat(entity.getTemplateContent()).isEqualTo("Conteudo novo");
        assertThat(entity.getVariables()).isEqualTo("{\"x\":\"y\"}");
    }
}
