package br.com.menufacil.converter;

import br.com.menufacil.domain.enums.UserRole;
import br.com.menufacil.domain.models.Role;
import br.com.menufacil.domain.models.TenantUnit;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.dto.CreateUserRequest;
import br.com.menufacil.dto.UpdateUserRequest;
import br.com.menufacil.dto.UserResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = {UserConverterImpl.class})
@ActiveProfiles("test")
class UserConverterTest {

    @Autowired
    private UserConverter converter;

    @Test
    void shouldConverterEntityParaResponse() {
        // Arrange
        UUID userId = UUID.randomUUID();
        UUID roleId = UUID.randomUUID();
        UUID unitId = UUID.randomUUID();

        Role role = new Role();
        role.setName("Gerente");

        TenantUnit unit = new TenantUnit();
        unit.setName("Filial Centro");

        User entity = new User();
        entity.setId(userId);
        entity.setName("João da Silva");
        entity.setEmail("joao@menufacil.com");
        entity.setPasswordHash("hashed-secret");
        entity.setSystemRole(UserRole.manager);
        entity.setRoleId(roleId);
        entity.setRole(role);
        entity.setUnitId(unitId);
        entity.setUnit(unit);
        entity.setActive(true);

        // Act
        UserResponse response = converter.toResponse(entity);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(userId.toString());
        assertThat(response.getName()).isEqualTo("João da Silva");
        assertThat(response.getEmail()).isEqualTo("joao@menufacil.com");
        assertThat(response.getSystemRole()).isEqualTo(UserRole.manager);
        assertThat(response.getRoleId()).isEqualTo(roleId.toString());
        assertThat(response.getRoleName()).isEqualTo("Gerente");
        assertThat(response.getUnitId()).isEqualTo(unitId.toString());
        assertThat(response.getUnitName()).isEqualTo("Filial Centro");
        assertThat(response.isActive()).isTrue();
    }

    @Test
    void shouldConverterRequestParaEntity() {
        // Arrange
        UUID roleId = UUID.randomUUID();
        UUID unitId = UUID.randomUUID();

        CreateUserRequest request = new CreateUserRequest();
        request.setName("Maria Souza");
        request.setEmail("maria@menufacil.com");
        request.setPassword("segredo123");
        request.setSystemRole(UserRole.cashier);
        request.setRoleId(roleId);
        request.setUnitId(unitId);

        // Act
        User entity = converter.toEntity(request);

        // Assert
        assertThat(entity).isNotNull();
        assertThat(entity.getId()).isNull();
        assertThat(entity.getTenantId()).isNull();
        assertThat(entity.getPasswordHash()).isNull();
        assertThat(entity.getName()).isEqualTo("Maria Souza");
        assertThat(entity.getEmail()).isEqualTo("maria@menufacil.com");
        assertThat(entity.getSystemRole()).isEqualTo(UserRole.cashier);
        assertThat(entity.getRoleId()).isEqualTo(roleId);
        assertThat(entity.getUnitId()).isEqualTo(unitId);
    }

    @Test
    void shouldAtualizarEntityComDadosDoRequest() {
        // Arrange
        UUID originalRoleId = UUID.randomUUID();
        UUID newRoleId = UUID.randomUUID();
        UUID newUnitId = UUID.randomUUID();

        User entity = new User();
        entity.setId(UUID.randomUUID());
        entity.setName("Antigo");
        entity.setEmail("antigo@menufacil.com");
        entity.setPasswordHash("hash-original");
        entity.setSystemRole(UserRole.cashier);
        entity.setRoleId(originalRoleId);
        entity.setActive(true);

        UpdateUserRequest request = new UpdateUserRequest();
        request.setName("Novo Nome");
        request.setSystemRole(UserRole.admin);
        request.setRoleId(newRoleId);
        request.setUnitId(newUnitId);
        request.setIsActive(false);

        // Act
        converter.updateFromRequest(request, entity);

        // Assert
        assertThat(entity.getName()).isEqualTo("Novo Nome");
        assertThat(entity.getEmail()).isEqualTo("antigo@menufacil.com");
        assertThat(entity.getPasswordHash()).isEqualTo("hash-original");
        assertThat(entity.getSystemRole()).isEqualTo(UserRole.admin);
        assertThat(entity.getRoleId()).isEqualTo(newRoleId);
        assertThat(entity.getUnitId()).isEqualTo(newUnitId);
        assertThat(entity.isActive()).isFalse();
    }
}
