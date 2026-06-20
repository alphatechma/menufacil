package br.com.menufacil.converter;

import br.com.menufacil.domain.enums.WhatsappFlowTriggerType;
import br.com.menufacil.domain.models.WhatsappFlow;
import br.com.menufacil.dto.CreateWhatsappFlowRequest;
import br.com.menufacil.dto.WhatsappFlowResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {WhatsappFlowConverterImpl.class})
@ActiveProfiles("test")
class WhatsappFlowConverterTest {

    @Autowired
    private WhatsappFlowConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        UUID id = UUID.randomUUID();
        WhatsappFlow entity = new WhatsappFlow();
        entity.setId(id);
        entity.setName("Boas-vindas");
        entity.setDescription("Fluxo inicial");
        entity.setTriggerType(WhatsappFlowTriggerType.keyword);
        entity.setTriggerConfig("{\"keyword\":\"oi\"}");
        entity.setNodes("[{\"id\":\"1\"}]");
        entity.setEdges("[]");
        entity.setActive(true);
        entity.setPriority(5);

        // Act
        WhatsappFlowResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(id.toString());
        assertThat(response.getName()).isEqualTo("Boas-vindas");
        assertThat(response.getDescription()).isEqualTo("Fluxo inicial");
        assertThat(response.getTriggerType()).isEqualTo("keyword");
        assertThat(response.getTriggerConfig()).isEqualTo("{\"keyword\":\"oi\"}");
        assertThat(response.getNodes()).isEqualTo("[{\"id\":\"1\"}]");
        assertThat(response.getEdges()).isEqualTo("[]");
        assertThat(response.isActive()).isTrue();
        assertThat(response.getPriority()).isEqualTo(5);
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        CreateWhatsappFlowRequest request = new CreateWhatsappFlowRequest();
        request.setName("Confirmação");
        request.setDescription("Fluxo de confirmação");
        request.setTriggerType("event");
        request.setTriggerConfig("{\"event\":\"order_created\"}");
        request.setNodes("[]");
        request.setEdges("[]");
        request.setActive(true);
        request.setPriority(10);

        // Act
        WhatsappFlow entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getName()).isEqualTo("Confirmação");
        assertThat(entity.getDescription()).isEqualTo("Fluxo de confirmação");
        assertThat(entity.getTriggerType()).isEqualTo(WhatsappFlowTriggerType.event);
        assertThat(entity.getTriggerConfig()).isEqualTo("{\"event\":\"order_created\"}");
        assertThat(entity.getNodes()).isEqualTo("[]");
        assertThat(entity.getEdges()).isEqualTo("[]");
        assertThat(entity.isActive()).isTrue();
        assertThat(entity.getPriority()).isEqualTo(10);
        assertThat(entity.getId()).isNull();
        assertThat(entity.getTenantId()).isNull();
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        UUID originalId = UUID.randomUUID();
        UUID originalTenant = UUID.randomUUID();
        WhatsappFlow entity = new WhatsappFlow();
        entity.setId(originalId);
        entity.setTenantId(originalTenant);
        entity.setName("Antigo");
        entity.setTriggerType(WhatsappFlowTriggerType.manual);
        entity.setActive(false);
        entity.setPriority(0);

        CreateWhatsappFlowRequest request = new CreateWhatsappFlowRequest();
        request.setName("Novo");
        request.setDescription("Atualizado");
        request.setTriggerType("scheduled");
        request.setTriggerConfig("{\"cron\":\"0 9 * * *\"}");
        request.setNodes("[{\"id\":\"1\",\"type\":\"start\"}]");
        request.setEdges("[]");
        request.setActive(true);
        request.setPriority(7);

        // Act
        converter.updateFromRequest(request, entity);

        // Assert
        assertThat(entity.getName()).isEqualTo("Novo");
        assertThat(entity.getDescription()).isEqualTo("Atualizado");
        assertThat(entity.getTriggerType()).isEqualTo(WhatsappFlowTriggerType.scheduled);
        assertThat(entity.getTriggerConfig()).isEqualTo("{\"cron\":\"0 9 * * *\"}");
        assertThat(entity.getNodes()).isEqualTo("[{\"id\":\"1\",\"type\":\"start\"}]");
        assertThat(entity.getEdges()).isEqualTo("[]");
        assertThat(entity.isActive()).isTrue();
        assertThat(entity.getPriority()).isEqualTo(7);
        assertThat(entity.getId()).isEqualTo(originalId);
        assertThat(entity.getTenantId()).isEqualTo(originalTenant);
    }
}
