package br.com.menufacil.converter;

import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreateSystemModuleRequest;
import br.com.menufacil.dto.SystemModuleResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {SystemModuleConverterImpl.class})
@ActiveProfiles("test")
class SystemModuleConverterTest {

    @Autowired
    private SystemModuleConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        SystemModule entity = new SystemModule();
        entity.setId(UUID.randomUUID());
        entity.setKey("delivery");
        entity.setName("Delivery");
        entity.setDescription("Módulo de delivery");

        // Act
        SystemModuleResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(entity.getId().toString());
        assertThat(response.getKey()).isEqualTo("delivery");
        assertThat(response.getName()).isEqualTo("Delivery");
        assertThat(response.getDescription()).isEqualTo("Módulo de delivery");
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        CreateSystemModuleRequest request = new CreateSystemModuleRequest();
        request.setKey("kds");
        request.setName("KDS");
        request.setDescription("Kitchen Display System");

        // Act
        SystemModule entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getKey()).isEqualTo("kds");
        assertThat(entity.getName()).isEqualTo("KDS");
        assertThat(entity.getDescription()).isEqualTo("Kitchen Display System");
        assertThat(entity.getId()).isNull();
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        SystemModule entity = new SystemModule();
        entity.setId(UUID.randomUUID());
        entity.setKey("old");
        entity.setName("Antigo");

        CreateSystemModuleRequest request = new CreateSystemModuleRequest();
        request.setKey("new");
        request.setName("Novo");
        request.setDescription("Atualizado");

        // Act
        converter.updateFromRequest(request, entity);

        // Assert
        assertThat(entity.getKey()).isEqualTo("new");
        assertThat(entity.getName()).isEqualTo("Novo");
        assertThat(entity.getDescription()).isEqualTo("Atualizado");
    }
}
