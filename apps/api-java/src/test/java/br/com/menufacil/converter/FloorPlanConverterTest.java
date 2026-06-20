package br.com.menufacil.converter;

import br.com.menufacil.domain.models.FloorPlan;
import br.com.menufacil.dto.CreateFloorPlanRequest;
import br.com.menufacil.dto.FloorPlanResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {FloorPlanConverterImpl.class})
@ActiveProfiles("test")
class FloorPlanConverterTest {

    @Autowired
    private FloorPlanConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID unitId = UUID.randomUUID();
        FloorPlan entity = new FloorPlan();
        entity.setId(id);
        entity.setName("Salão Principal");
        entity.setUnitId(unitId);
        entity.setLayout("[]");

        // Act
        FloorPlanResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(id.toString());
        assertThat(response.getName()).isEqualTo("Salão Principal");
        assertThat(response.getUnitId()).isEqualTo(unitId.toString());
        assertThat(response.getLayout()).isEqualTo("[]");
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        UUID unitId = UUID.randomUUID();
        CreateFloorPlanRequest request = new CreateFloorPlanRequest();
        request.setName("Salão Térreo");
        request.setUnitId(unitId);
        request.setLayout("[{\"table_id\":\"1\"}]");

        // Act
        FloorPlan entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getName()).isEqualTo("Salão Térreo");
        assertThat(entity.getUnitId()).isEqualTo(unitId);
        assertThat(entity.getLayout()).isEqualTo("[{\"table_id\":\"1\"}]");
        assertThat(entity.getId()).isNull();
        assertThat(entity.getTenantId()).isNull();
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        UUID originalId = UUID.randomUUID();
        UUID originalTenant = UUID.randomUUID();
        FloorPlan entity = new FloorPlan();
        entity.setId(originalId);
        entity.setTenantId(originalTenant);
        entity.setName("Antigo");
        entity.setLayout("[]");

        UUID newUnitId = UUID.randomUUID();
        CreateFloorPlanRequest request = new CreateFloorPlanRequest();
        request.setName("Novo");
        request.setUnitId(newUnitId);
        request.setLayout("[{\"x\":1}]");

        // Act
        converter.updateFromRequest(request, entity);

        // Assert
        assertThat(entity.getName()).isEqualTo("Novo");
        assertThat(entity.getUnitId()).isEqualTo(newUnitId);
        assertThat(entity.getLayout()).isEqualTo("[{\"x\":1}]");
        assertThat(entity.getId()).isEqualTo(originalId);
        assertThat(entity.getTenantId()).isEqualTo(originalTenant);
    }
}
