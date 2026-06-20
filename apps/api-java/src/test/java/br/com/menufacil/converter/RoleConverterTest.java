package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.Role;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreateRoleRequest;
import br.com.menufacil.dto.RoleResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {RoleConverterImpl.class, PermissionConverterImpl.class})
@ActiveProfiles("test")
class RoleConverterTest {

    @Autowired
    private RoleConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        SystemModule module = new SystemModule();
        module.setId(UUID.randomUUID());
        module.setKey("product");
        module.setName("Produtos");

        Permission permission = new Permission();
        permission.setId(UUID.randomUUID());
        permission.setKey("product:create");
        permission.setName("Criar produto");
        permission.setModule(module);

        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setName("Atendente");
        role.setDescription("Atendimento ao cliente");
        role.setSystemDefault(false);
        Set<Permission> permissions = new HashSet<>();
        permissions.add(permission);
        role.setPermissions(permissions);

        // Act
        RoleResponse response = converter.toResponse(role);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(role.getId().toString());
        assertThat(response.getName()).isEqualTo("Atendente");
        assertThat(response.getDescription()).isEqualTo("Atendimento ao cliente");
        assertThat(response.isSystemDefault()).isFalse();
        assertThat(response.getPermissions()).hasSize(1);
        assertThat(response.getPermissions().get(0).getKey()).isEqualTo("product:create");
        assertThat(response.getPermissions().get(0).getModuleKey()).isEqualTo("product");
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Gerente");
        request.setDescription("Gestão da loja");
        request.setPermissionIds(List.of(UUID.randomUUID().toString()));

        // Act
        Role entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getName()).isEqualTo("Gerente");
        assertThat(entity.getDescription()).isEqualTo("Gestão da loja");
        assertThat(entity.getId()).isNull();
        assertThat(entity.getTenantId()).isNull();
        assertThat(entity.isSystemDefault()).isFalse();
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setName("Antigo");
        role.setDescription("Descrição antiga");

        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Novo");
        request.setDescription("Descrição nova");

        // Act
        converter.updateFromRequest(request, role);

        // Assert
        assertThat(role.getName()).isEqualTo("Novo");
        assertThat(role.getDescription()).isEqualTo("Descrição nova");
    }
}
