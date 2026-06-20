package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Plan;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreatePlanRequest;
import br.com.menufacil.dto.PlanResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {PlanConverterImpl.class, SystemModuleConverterImpl.class})
@ActiveProfiles("test")
class PlanConverterTest {

    @Autowired
    private PlanConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        SystemModule module = new SystemModule();
        module.setId(UUID.randomUUID());
        module.setKey("delivery");
        module.setName("Delivery");

        Plan entity = new Plan();
        entity.setId(UUID.randomUUID());
        entity.setName("Plano Pro");
        entity.setPrice(new BigDecimal("99.90"));
        entity.setMaxUsers(10);
        entity.setMaxProducts(500);
        entity.setActive(true);
        Set<SystemModule> modules = new HashSet<>();
        modules.add(module);
        entity.setModules(modules);

        // Act
        PlanResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(entity.getId().toString());
        assertThat(response.getName()).isEqualTo("Plano Pro");
        assertThat(response.getPrice()).isEqualByComparingTo(new BigDecimal("99.90"));
        assertThat(response.getMaxUsers()).isEqualTo(10);
        assertThat(response.getMaxProducts()).isEqualTo(500);
        assertThat(response.isActive()).isTrue();
        assertThat(response.getModules()).hasSize(1);
        assertThat(response.getModules().get(0).getKey()).isEqualTo("delivery");
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        CreatePlanRequest request = new CreatePlanRequest();
        request.setName("Plano Starter");
        request.setPrice(new BigDecimal("19.90"));
        request.setMaxUsers(3);
        request.setMaxProducts(50);
        request.setIsActive(true);

        // Act
        Plan entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getName()).isEqualTo("Plano Starter");
        assertThat(entity.getPrice()).isEqualByComparingTo(new BigDecimal("19.90"));
        assertThat(entity.getMaxUsers()).isEqualTo(3);
        assertThat(entity.getMaxProducts()).isEqualTo(50);
        assertThat(entity.isActive()).isTrue();
        assertThat(entity.getId()).isNull();
        assertThat(entity.getModules()).isEmpty();
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        Plan entity = new Plan();
        entity.setId(UUID.randomUUID());
        entity.setName("Antigo");
        entity.setPrice(new BigDecimal("10.00"));
        entity.setActive(false);

        CreatePlanRequest request = new CreatePlanRequest();
        request.setName("Novo");
        request.setPrice(new BigDecimal("49.90"));
        request.setMaxUsers(5);
        request.setMaxProducts(100);
        request.setIsActive(true);

        // Act
        converter.updateFromRequest(request, entity);

        // Assert
        assertThat(entity.getName()).isEqualTo("Novo");
        assertThat(entity.getPrice()).isEqualByComparingTo(new BigDecimal("49.90"));
        assertThat(entity.getMaxUsers()).isEqualTo(5);
        assertThat(entity.getMaxProducts()).isEqualTo(100);
        assertThat(entity.isActive()).isTrue();
    }
}
