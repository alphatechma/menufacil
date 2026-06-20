package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateRoleRequest;
import br.com.menufacil.dto.PermissionResponse;
import br.com.menufacil.dto.RoleResponse;
import br.com.menufacil.service.RoleService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RoleControllerTest {

    @Mock private RoleService roleService;

    @InjectMocks
    private RoleController roleController;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenant("tenant-slug", tenantId.toString());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldListarCargosDoTenant() {
        // Arrange
        when(roleService.findAllByTenant(tenantId))
                .thenReturn(List.of(RoleResponse.builder().name("Atendente").build()));

        // Act
        ResponseEntity<List<RoleResponse>> response = roleController.findAll();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getName()).isEqualTo("Atendente");
    }

    @Test
    void shouldListarTodasPermissoes() {
        // Arrange
        when(roleService.findAllPermissions())
                .thenReturn(List.of(PermissionResponse.builder().key("product:create").build()));

        // Act
        ResponseEntity<List<PermissionResponse>> response = roleController.findPermissions();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getKey()).isEqualTo("product:create");
    }

    @Test
    void shouldBuscarCargoPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(roleService.findById(id, tenantId))
                .thenReturn(RoleResponse.builder().name("Gerente").build());

        // Act
        ResponseEntity<RoleResponse> response = roleController.findById(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Gerente");
    }

    @Test
    void shouldCriarCargo() {
        // Arrange
        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Atendente");
        when(roleService.create(eq(tenantId), any(CreateRoleRequest.class)))
                .thenReturn(RoleResponse.builder().name("Atendente").build());

        // Act
        ResponseEntity<RoleResponse> response = roleController.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Atendente");
    }

    @Test
    void shouldAtualizarCargo() {
        // Arrange
        UUID id = UUID.randomUUID();
        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Novo");
        when(roleService.update(eq(id), eq(tenantId), any(CreateRoleRequest.class)))
                .thenReturn(RoleResponse.builder().name("Novo").build());

        // Act
        ResponseEntity<RoleResponse> response = roleController.update(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Novo");
    }

    @Test
    void shouldDeletarCargo() {
        // Arrange
        UUID id = UUID.randomUUID();

        // Act
        ResponseEntity<Void> response = roleController.delete(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(roleService).delete(id, tenantId);
    }
}
