package br.com.menufacil.converter;

import br.com.menufacil.domain.models.AuditLog;
import br.com.menufacil.dto.AuditLogResponse;
import br.com.menufacil.dto.CreateAuditLogRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {AuditLogConverterImpl.class})
@ActiveProfiles("test")
class AuditLogConverterTest {

    @Autowired
    private AuditLogConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        AuditLog entity = new AuditLog();
        entity.setId(id);
        entity.setTenantId(tenantId);
        entity.setUserId(userId);
        entity.setUserEmail("admin@menufacil.com.br");
        entity.setAction("create");
        entity.setEntityType("product");
        entity.setEntityId(entityId);
        entity.setEntityName("Pizza Margherita");
        entity.setDetails("{\"price\":29.90}");
        entity.setIpAddress("127.0.0.1");

        // Act
        AuditLogResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(id.toString());
        assertThat(response.getTenantId()).isEqualTo(tenantId.toString());
        assertThat(response.getUserId()).isEqualTo(userId.toString());
        assertThat(response.getUserEmail()).isEqualTo("admin@menufacil.com.br");
        assertThat(response.getAction()).isEqualTo("create");
        assertThat(response.getEntityType()).isEqualTo("product");
        assertThat(response.getEntityId()).isEqualTo(entityId.toString());
        assertThat(response.getEntityName()).isEqualTo("Pizza Margherita");
        assertThat(response.getDetails()).isEqualTo("{\"price\":29.90}");
        assertThat(response.getIpAddress()).isEqualTo("127.0.0.1");
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        UUID userId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        CreateAuditLogRequest request = new CreateAuditLogRequest();
        request.setUserId(userId);
        request.setUserEmail("admin@menufacil.com.br");
        request.setAction("update");
        request.setEntityType("category");
        request.setEntityId(entityId);
        request.setEntityName("Pizzas");
        request.setDetails("{\"name\":\"Pizzas\"}");
        request.setIpAddress("192.168.0.1");

        // Act
        AuditLog entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getId()).isNull();
        assertThat(entity.getTenantId()).isNull();
        assertThat(entity.getUserId()).isEqualTo(userId);
        assertThat(entity.getUserEmail()).isEqualTo("admin@menufacil.com.br");
        assertThat(entity.getAction()).isEqualTo("update");
        assertThat(entity.getEntityType()).isEqualTo("category");
        assertThat(entity.getEntityId()).isEqualTo(entityId);
        assertThat(entity.getEntityName()).isEqualTo("Pizzas");
        assertThat(entity.getDetails()).isEqualTo("{\"name\":\"Pizzas\"}");
        assertThat(entity.getIpAddress()).isEqualTo("192.168.0.1");
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        UUID originalId = UUID.randomUUID();
        UUID originalTenant = UUID.randomUUID();

        AuditLog entity = new AuditLog();
        entity.setId(originalId);
        entity.setTenantId(originalTenant);
        entity.setAction("create");
        entity.setEntityType("product");
        entity.setUserEmail("old@menufacil.com.br");

        CreateAuditLogRequest request = new CreateAuditLogRequest();
        request.setUserEmail("new@menufacil.com.br");
        request.setAction("delete");
        request.setEntityType("order");

        // Act
        converter.updateFromRequest(request, entity);

        // Assert
        assertThat(entity.getId()).isEqualTo(originalId);
        assertThat(entity.getTenantId()).isEqualTo(originalTenant);
        assertThat(entity.getUserEmail()).isEqualTo("new@menufacil.com.br");
        assertThat(entity.getAction()).isEqualTo("delete");
        assertThat(entity.getEntityType()).isEqualTo("order");
    }
}
