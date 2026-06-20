package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.ChangePasswordRequest;
import br.com.menufacil.dto.CreateUserRequest;
import br.com.menufacil.dto.UpdateUserRequest;
import br.com.menufacil.dto.UserResponse;
import br.com.menufacil.service.UserService;
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

class UserControllerTest {

    @Mock private UserService userService;

    @InjectMocks
    private UserController userController;

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
    void shouldListarUsuariosDoTenant() {
        // Arrange
        when(userService.findAllByTenant(tenantId))
                .thenReturn(List.of(UserResponse.builder().build()));

        // Act
        ResponseEntity<List<UserResponse>> response = userController.findAll();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldObterPerfilDoUsuarioAutenticado() {
        // Arrange
        when(userService.findCurrentUser(tenantId))
                .thenReturn(UserResponse.builder().email("me@menufacil.com").build());

        // Act
        ResponseEntity<UserResponse> response = userController.findCurrentUser();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getEmail()).isEqualTo("me@menufacil.com");
    }

    @Test
    void shouldAlterarPropriaSenha() {
        // Arrange
        ChangePasswordRequest request = new ChangePasswordRequest();
        request.setCurrentPassword("antiga123");
        request.setNewPassword("nova12345");

        // Act
        ResponseEntity<Void> response = userController.changePassword(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(userService).changeCurrentUserPassword(tenantId, request);
    }

    @Test
    void shouldBuscarUsuarioPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(userService.findById(id, tenantId)).thenReturn(UserResponse.builder().build());

        // Act
        ResponseEntity<UserResponse> response = userController.findById(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void shouldCriarUsuario() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest();
        request.setName("Novo");
        request.setEmail("novo@menufacil.com");
        request.setPassword("segredo123");

        when(userService.create(eq(tenantId), any(CreateUserRequest.class)))
                .thenReturn(UserResponse.builder().email("novo@menufacil.com").build());

        // Act
        ResponseEntity<UserResponse> response = userController.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getEmail()).isEqualTo("novo@menufacil.com");
    }

    @Test
    void shouldAtualizarUsuario() {
        // Arrange
        UUID id = UUID.randomUUID();
        UpdateUserRequest request = new UpdateUserRequest();
        request.setName("Atualizado");

        when(userService.update(eq(id), eq(tenantId), any(UpdateUserRequest.class)))
                .thenReturn(UserResponse.builder().name("Atualizado").build());

        // Act
        ResponseEntity<UserResponse> response = userController.update(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Atualizado");
    }

    @Test
    void shouldDesativarUsuarioViaSoftDelete() {
        // Arrange
        UUID id = UUID.randomUUID();

        // Act
        ResponseEntity<Void> response = userController.delete(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(userService).delete(id, tenantId);
    }
}
