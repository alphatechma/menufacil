package br.com.menufacil.service;

import br.com.menufacil.converter.FloorPlanConverter;
import br.com.menufacil.domain.models.FloorPlan;
import br.com.menufacil.dto.CreateFloorPlanRequest;
import br.com.menufacil.dto.FloorPlanResponse;
import br.com.menufacil.repository.FloorPlanRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FloorPlanServiceTest {

    @Mock private FloorPlanRepository floorPlanRepository;
    @Mock private FloorPlanConverter floorPlanConverter;
    @Mock private AuditLogService auditLogService;

    @InjectMocks
    private FloorPlanService floorPlanService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldCriarMapaDoSalao() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        CreateFloorPlanRequest request = new CreateFloorPlanRequest();
        request.setName("Salão Principal");
        request.setLayout("[]");

        FloorPlan entity = new FloorPlan();
        entity.setName("Salão Principal");

        FloorPlan saved = new FloorPlan();
        saved.setId(UUID.randomUUID());
        saved.setName("Salão Principal");
        saved.setTenantId(tenantId);

        FloorPlanResponse response = FloorPlanResponse.builder()
                .id(saved.getId().toString())
                .name("Salão Principal")
                .build();

        when(floorPlanConverter.toEntity(request)).thenReturn(entity);
        when(floorPlanRepository.save(entity)).thenReturn(saved);
        when(floorPlanConverter.toResponse(saved)).thenReturn(response);

        // Act
        FloorPlanResponse result = floorPlanService.create(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Salão Principal");
        assertThat(entity.getTenantId()).isEqualTo(tenantId);
        verify(floorPlanRepository).save(entity);
    }

    @Test
    void shouldListarMapasDoTenant() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        FloorPlan p1 = new FloorPlan();
        FloorPlan p2 = new FloorPlan();

        when(floorPlanRepository.findByTenantIdOrderByCreatedAtAsc(tenantId))
                .thenReturn(List.of(p1, p2));
        when(floorPlanConverter.toResponse(any()))
                .thenReturn(FloorPlanResponse.builder().build());

        // Act
        List<FloorPlanResponse> result = floorPlanService.findByTenant(tenantId, null);

        // Assert
        assertThat(result).hasSize(2);
        verify(floorPlanRepository).findByTenantIdOrderByCreatedAtAsc(tenantId);
    }

    @Test
    void shouldListarMapasFiltrandoPorUnidade() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID unitId = UUID.randomUUID();
        FloorPlan p1 = new FloorPlan();

        when(floorPlanRepository.findByTenantIdAndUnitIdOrderByCreatedAtAsc(tenantId, unitId))
                .thenReturn(List.of(p1));
        when(floorPlanConverter.toResponse(any()))
                .thenReturn(FloorPlanResponse.builder().build());

        // Act
        List<FloorPlanResponse> result = floorPlanService.findByTenant(tenantId, unitId);

        // Assert
        assertThat(result).hasSize(1);
        verify(floorPlanRepository).findByTenantIdAndUnitIdOrderByCreatedAtAsc(tenantId, unitId);
    }

    @Test
    void shouldBuscarMapaPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        FloorPlan entity = new FloorPlan();
        entity.setId(id);
        entity.setTenantId(tenantId);

        when(floorPlanRepository.findById(id)).thenReturn(Optional.of(entity));
        when(floorPlanConverter.toResponse(entity))
                .thenReturn(FloorPlanResponse.builder().id(id.toString()).build());

        // Act
        FloorPlanResponse result = floorPlanService.findById(id, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(id.toString());
    }

    @Test
    void shouldLancarNotFoundQuandoMapaNaoExiste() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        when(floorPlanRepository.findById(id)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> floorPlanService.findById(id, tenantId))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldAtualizarMapaValidandoTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        FloorPlan existing = new FloorPlan();
        existing.setId(id);
        existing.setTenantId(tenantId);
        existing.setName("Antigo");

        CreateFloorPlanRequest request = new CreateFloorPlanRequest();
        request.setName("Novo");

        when(floorPlanRepository.findById(id)).thenReturn(Optional.of(existing));
        when(floorPlanRepository.save(existing)).thenReturn(existing);
        when(floorPlanConverter.toResponse(existing))
                .thenReturn(FloorPlanResponse.builder().name("Novo").build());

        // Act
        FloorPlanResponse result = floorPlanService.update(id, tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        verify(floorPlanConverter).updateFromRequest(request, existing);
        verify(floorPlanRepository).save(existing);
    }

    @Test
    void shouldLancarForbiddenAoAtualizarDeOutroTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID outroTenant = UUID.randomUUID();
        FloorPlan existing = new FloorPlan();
        existing.setId(id);
        existing.setTenantId(outroTenant);

        CreateFloorPlanRequest request = new CreateFloorPlanRequest();
        request.setName("Hack");

        when(floorPlanRepository.findById(id)).thenReturn(Optional.of(existing));

        // Act + Assert
        assertThatThrownBy(() -> floorPlanService.update(id, tenantId, request))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldDeletarMapaValidandoTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        FloorPlan entity = new FloorPlan();
        entity.setId(id);
        entity.setTenantId(tenantId);

        when(floorPlanRepository.findById(id)).thenReturn(Optional.of(entity));

        // Act
        floorPlanService.delete(id, tenantId);

        // Assert
        verify(floorPlanRepository).delete(entity);
    }

    @Test
    void shouldLancarForbiddenAoDeletarDeOutroTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID outroTenant = UUID.randomUUID();
        FloorPlan entity = new FloorPlan();
        entity.setId(id);
        entity.setTenantId(outroTenant);

        when(floorPlanRepository.findById(id)).thenReturn(Optional.of(entity));

        // Act + Assert
        assertThatThrownBy(() -> floorPlanService.delete(id, tenantId))
                .isInstanceOf(ResponseStatusException.class);
    }
}
