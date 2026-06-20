package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateFloorPlanRequest;
import br.com.menufacil.dto.FloorPlanResponse;
import br.com.menufacil.service.FloorPlanService;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FloorPlanControllerTest {

    @Mock private FloorPlanService floorPlanService;

    @InjectMocks
    private FloorPlanController floorPlanController;

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
    void shouldListarMapasDoTenant() {
        // Arrange
        when(floorPlanService.findByTenant(tenantId, null))
                .thenReturn(List.of(FloorPlanResponse.builder().name("Salão Principal").build()));

        // Act
        ResponseEntity<List<FloorPlanResponse>> response = floorPlanController.list(null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        verify(floorPlanService).findByTenant(tenantId, null);
    }

    @Test
    void shouldListarMapasFiltrandoPorUnidade() {
        // Arrange
        UUID unitId = UUID.randomUUID();
        when(floorPlanService.findByTenant(tenantId, unitId))
                .thenReturn(List.of(FloorPlanResponse.builder().build()));

        // Act
        ResponseEntity<List<FloorPlanResponse>> response = floorPlanController.list(unitId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        verify(floorPlanService).findByTenant(tenantId, unitId);
    }

    @Test
    void shouldBuscarMapaPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(floorPlanService.findById(id, tenantId))
                .thenReturn(FloorPlanResponse.builder().id(id.toString()).build());

        // Act
        ResponseEntity<FloorPlanResponse> response = floorPlanController.findById(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(id.toString());
    }

    @Test
    void shouldCriarMapa() {
        // Arrange
        CreateFloorPlanRequest request = new CreateFloorPlanRequest();
        request.setName("Salão Térreo");
        when(floorPlanService.create(tenantId, request))
                .thenReturn(FloorPlanResponse.builder().name("Salão Térreo").build());

        // Act
        ResponseEntity<FloorPlanResponse> response = floorPlanController.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        verify(floorPlanService).create(tenantId, request);
    }

    @Test
    void shouldAtualizarMapa() {
        // Arrange
        UUID id = UUID.randomUUID();
        CreateFloorPlanRequest request = new CreateFloorPlanRequest();
        request.setName("Atualizado");
        when(floorPlanService.update(id, tenantId, request))
                .thenReturn(FloorPlanResponse.builder().name("Atualizado").build());

        // Act
        ResponseEntity<FloorPlanResponse> response = floorPlanController.update(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        verify(floorPlanService).update(id, tenantId, request);
    }

    @Test
    void shouldDeletarMapa() {
        // Arrange
        UUID id = UUID.randomUUID();

        // Act
        ResponseEntity<Void> response = floorPlanController.delete(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(floorPlanService).delete(id, tenantId);
    }
}
