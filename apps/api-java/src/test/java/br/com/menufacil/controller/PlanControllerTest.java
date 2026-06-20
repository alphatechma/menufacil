package br.com.menufacil.controller;

import br.com.menufacil.dto.AssignPlanModulesRequest;
import br.com.menufacil.dto.CreatePlanRequest;
import br.com.menufacil.dto.PlanResponse;
import br.com.menufacil.service.PlanService;
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

class PlanControllerTest {

    @Mock private PlanService planService;

    @InjectMocks
    private PlanController planController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldListarTodosPlanos() {
        // Arrange
        when(planService.findAll()).thenReturn(List.of(PlanResponse.builder().build()));

        // Act
        ResponseEntity<List<PlanResponse>> response = planController.findAll();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldBuscarPlanoPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(planService.findById(id)).thenReturn(PlanResponse.builder().build());

        // Act
        ResponseEntity<PlanResponse> response = planController.findById(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void shouldCriarPlano() {
        // Arrange
        CreatePlanRequest request = new CreatePlanRequest();
        when(planService.create(request)).thenReturn(PlanResponse.builder().build());

        // Act
        ResponseEntity<PlanResponse> response = planController.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        verify(planService).create(request);
    }

    @Test
    void shouldAtualizarPlano() {
        // Arrange
        UUID id = UUID.randomUUID();
        CreatePlanRequest request = new CreatePlanRequest();
        when(planService.update(id, request)).thenReturn(PlanResponse.builder().build());

        // Act
        ResponseEntity<PlanResponse> response = planController.update(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(planService).update(id, request);
    }

    @Test
    void shouldDeletarPlano() {
        // Arrange
        UUID id = UUID.randomUUID();

        // Act
        ResponseEntity<Void> response = planController.delete(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(planService).delete(id);
    }

    @Test
    void shouldAtribuirModulosAoPlano() {
        // Arrange
        UUID id = UUID.randomUUID();
        AssignPlanModulesRequest request = new AssignPlanModulesRequest();
        request.setModuleIds(List.of(UUID.randomUUID().toString()));
        when(planService.assignModules(id, request.getModuleIds()))
                .thenReturn(PlanResponse.builder().build());

        // Act
        ResponseEntity<PlanResponse> response = planController.assignModules(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(planService).assignModules(id, request.getModuleIds());
    }
}
