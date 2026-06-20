package br.com.menufacil.controller;

import br.com.menufacil.dto.CreateSystemModuleRequest;
import br.com.menufacil.dto.SystemModuleResponse;
import br.com.menufacil.service.SystemModuleService;
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

class SystemModuleControllerTest {

    @Mock private SystemModuleService systemModuleService;

    @InjectMocks
    private SystemModuleController systemModuleController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldListarTodosModulos() {
        // Arrange
        when(systemModuleService.findAll()).thenReturn(List.of(SystemModuleResponse.builder().build()));

        // Act
        ResponseEntity<List<SystemModuleResponse>> response = systemModuleController.findAll();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldBuscarPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(systemModuleService.findById(id)).thenReturn(SystemModuleResponse.builder().build());

        // Act
        ResponseEntity<SystemModuleResponse> response = systemModuleController.findById(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void shouldCriarModulo() {
        // Arrange
        CreateSystemModuleRequest request = new CreateSystemModuleRequest();
        when(systemModuleService.create(request)).thenReturn(SystemModuleResponse.builder().build());

        // Act
        ResponseEntity<SystemModuleResponse> response = systemModuleController.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
    }

    @Test
    void shouldAtualizarModulo() {
        // Arrange
        UUID id = UUID.randomUUID();
        CreateSystemModuleRequest request = new CreateSystemModuleRequest();
        when(systemModuleService.update(id, request)).thenReturn(SystemModuleResponse.builder().build());

        // Act
        ResponseEntity<SystemModuleResponse> response = systemModuleController.update(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void shouldDeletarModulo() {
        // Arrange
        UUID id = UUID.randomUUID();

        // Act
        ResponseEntity<Void> response = systemModuleController.delete(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(systemModuleService).delete(id);
    }
}
