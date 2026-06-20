package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateTenantUnitRequest;
import br.com.menufacil.dto.TenantUnitResponse;
import br.com.menufacil.service.TenantUnitService;
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

class TenantUnitControllerTest {

    @Mock private TenantUnitService tenantUnitService;

    @InjectMocks
    private TenantUnitController tenantUnitController;

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
    void shouldListarUnidadesDoTenant() {
        // Arrange
        when(tenantUnitService.findAllByTenant(tenantId))
                .thenReturn(List.of(TenantUnitResponse.builder().build()));

        // Act
        ResponseEntity<List<TenantUnitResponse>> response = tenantUnitController.findAll();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldBuscarUnidadePorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(tenantUnitService.findById(id, tenantId))
                .thenReturn(TenantUnitResponse.builder().build());

        // Act
        ResponseEntity<TenantUnitResponse> response = tenantUnitController.findById(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void shouldCriarNovaUnidade() {
        // Arrange
        CreateTenantUnitRequest request = new CreateTenantUnitRequest();
        request.setName("Centro");
        request.setSlug("centro");

        when(tenantUnitService.create(eq(tenantId), any(CreateTenantUnitRequest.class)))
                .thenReturn(TenantUnitResponse.builder().name("Centro").build());

        // Act
        ResponseEntity<TenantUnitResponse> response = tenantUnitController.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Centro");
    }

    @Test
    void shouldAtualizarUnidade() {
        // Arrange
        UUID id = UUID.randomUUID();
        CreateTenantUnitRequest request = new CreateTenantUnitRequest();
        request.setName("Atualizado");
        request.setSlug("atualizado");

        when(tenantUnitService.update(eq(id), eq(tenantId), any(CreateTenantUnitRequest.class)))
                .thenReturn(TenantUnitResponse.builder().name("Atualizado").build());

        // Act
        ResponseEntity<TenantUnitResponse> response = tenantUnitController.update(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Atualizado");
    }

    @Test
    void shouldDesativarUnidadeViaSoftDelete() {
        // Arrange
        UUID id = UUID.randomUUID();

        // Act
        ResponseEntity<Void> response = tenantUnitController.delete(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        verify(tenantUnitService).delete(id, tenantId);
    }
}
