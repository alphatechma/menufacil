package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreatePermissionRequest;
import br.com.menufacil.dto.PermissionResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {PermissionConverterImpl.class})
@ActiveProfiles("test")
class PermissionConverterTest {

    @Autowired
    private PermissionConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        SystemModule module = new SystemModule();
        module.setId(UUID.randomUUID());
        module.setKey("product");
        module.setName("Produto");

        Permission entity = new Permission();
        entity.setId(UUID.randomUUID());
        entity.setKey("product:create");
        entity.setName("Criar Produto");
        entity.setModule(module);

        // Act
        PermissionResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(entity.getId().toString());
        assertThat(response.getKey()).isEqualTo("product:create");
        assertThat(response.getName()).isEqualTo("Criar Produto");
        assertThat(response.getModuleId()).isEqualTo(module.getId().toString());
        assertThat(response.getModuleKey()).isEqualTo("product");
        assertThat(response.getModuleName()).isEqualTo("Produto");
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        CreatePermissionRequest request = new CreatePermissionRequest();
        request.setKey("order:read");
        request.setName("Visualizar Pedido");
        request.setModuleId(UUID.randomUUID());

        // Act
        Permission entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getKey()).isEqualTo("order:read");
        assertThat(entity.getName()).isEqualTo("Visualizar Pedido");
        assertThat(entity.getId()).isNull();
        assertThat(entity.getModule()).isNull();
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        Permission entity = new Permission();
        entity.setId(UUID.randomUUID());
        entity.setKey("old:key");
        entity.setName("Antiga");

        CreatePermissionRequest request = new CreatePermissionRequest();
        request.setKey("new:key");
        request.setName("Nova Permissao");

        // Act
        converter.updateFromRequest(request, entity);

        // Assert
        assertThat(entity.getKey()).isEqualTo("new:key");
        assertThat(entity.getName()).isEqualTo("Nova Permissao");
    }
}
