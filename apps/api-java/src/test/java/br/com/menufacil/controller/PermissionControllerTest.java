package br.com.menufacil.controller;

import br.com.menufacil.dto.CreatePermissionRequest;
import br.com.menufacil.dto.PermissionResponse;
import br.com.menufacil.service.PermissionService;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PermissionControllerTest {

    @Mock private PermissionService permissionService;

    @InjectMocks
    private PermissionController permissionController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldListarTodasPermissoesSemFiltro() {
        // Arrange
        when(permissionService.findAll(null))
                .thenReturn(List.of(PermissionResponse.builder().build()));

        // Act
        ResponseEntity<List<PermissionResponse>> response = permissionController.findAll(null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldListarPermissoesFiltrandoPorModulo() {
        // Arrange
        UUID moduleId = UUID.randomUUID();
        when(permissionService.findAll(moduleId))
                .thenReturn(List.of(PermissionResponse.builder().build()));

        // Act
        ResponseEntity<List<PermissionResponse>> response = permissionController.findAll(moduleId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        verify(permissionService).findAll(moduleId);
    }

    @Test
    void shouldBuscarPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(permissionService.findById(id)).thenReturn(PermissionResponse.builder().build());

        // Act
        ResponseEntity<PermissionResponse> response = permissionController.findById(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void shouldCriarPermissao() {
        // Arrange
        CreatePermissionRequest request = new CreatePermissionRequest();
        when(permissionService.create(request)).thenReturn(PermissionResponse.builder().build());

        // Act
        ResponseEntity<PermissionResponse> response = permissionController.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void shouldAtualizarPermissao() {
        // Arrange
        UUID id = UUID.randomUUID();
        CreatePermissionRequest request = new CreatePermissionRequest();
        when(permissionService.update(id, request)).thenReturn(PermissionResponse.builder().build());

        // Act
        ResponseEntity<PermissionResponse> response = permissionController.update(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldDeletarPermissao() {
        // Arrange
        UUID id = UUID.randomUUID();

        // Act
        ResponseEntity<Void> response = permissionController.delete(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(permissionService).delete(id);
    }
}
