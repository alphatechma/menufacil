package br.com.menufacil.service;

import br.com.menufacil.converter.TenantUnitConverter;
import br.com.menufacil.domain.models.TenantUnit;
import br.com.menufacil.dto.CreateTenantUnitRequest;
import br.com.menufacil.dto.TenantUnitResponse;
import br.com.menufacil.repository.TenantUnitRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TenantUnitServiceTest {

    @Mock private TenantUnitRepository tenantUnitRepository;
    @Mock private TenantUnitConverter tenantUnitConverter;
    @Mock private AuditLogService auditLogService;

    @InjectMocks
    private TenantUnitService tenantUnitService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldCriarPrimeiraUnidadeComoMatriz() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        CreateTenantUnitRequest request = new CreateTenantUnitRequest();
        request.setName("Unidade Centro");
        request.setSlug("centro");

        TenantUnit entity = new TenantUnit();
        entity.setName("Unidade Centro");
        entity.setSlug("centro");

        TenantUnit saved = new TenantUnit();
        saved.setId(UUID.randomUUID());
        saved.setName("Unidade Centro");
        saved.setSlug("centro");
        saved.setHeadquarters(true);

        TenantUnitResponse response = TenantUnitResponse.builder()
                .id(saved.getId().toString())
                .name("Unidade Centro")
                .slug("centro")
                .headquarters(true)
                .build();

        when(tenantUnitRepository.findByTenantIdAndSlug(tenantId, "centro"))
                .thenReturn(Optional.empty());
        when(tenantUnitConverter.toEntity(request)).thenReturn(entity);
        when(tenantUnitRepository.countByTenantId(tenantId)).thenReturn(0L);
        when(tenantUnitRepository.save(any(TenantUnit.class))).thenReturn(saved);
        when(tenantUnitConverter.toResponse(saved)).thenReturn(response);

        // Act
        TenantUnitResponse result = tenantUnitService.create(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.isHeadquarters()).isTrue();

        ArgumentCaptor<TenantUnit> captor = ArgumentCaptor.forClass(TenantUnit.class);
        verify(tenantUnitRepository).save(captor.capture());
        assertThat(captor.getValue().isHeadquarters()).isTrue();
        assertThat(captor.getValue().getTenantId()).isEqualTo(tenantId);
    }

    @Test
    void shouldCriarSegundaUnidadeSemSerMatriz() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        CreateTenantUnitRequest request = new CreateTenantUnitRequest();
        request.setName("Filial");
        request.setSlug("filial");

        TenantUnit entity = new TenantUnit();
        entity.setName("Filial");
        entity.setSlug("filial");

        TenantUnit saved = new TenantUnit();
        saved.setId(UUID.randomUUID());
        saved.setName("Filial");

        when(tenantUnitRepository.findByTenantIdAndSlug(tenantId, "filial"))
                .thenReturn(Optional.empty());
        when(tenantUnitConverter.toEntity(request)).thenReturn(entity);
        when(tenantUnitRepository.countByTenantId(tenantId)).thenReturn(1L);
        when(tenantUnitRepository.save(any(TenantUnit.class))).thenReturn(saved);
        when(tenantUnitConverter.toResponse(saved))
                .thenReturn(TenantUnitResponse.builder().name("Filial").build());

        // Act
        TenantUnitResponse result = tenantUnitService.create(tenantId, request);

        // Assert
        assertThat(result).isNotNull();

        ArgumentCaptor<TenantUnit> captor = ArgumentCaptor.forClass(TenantUnit.class);
        verify(tenantUnitRepository).save(captor.capture());
        assertThat(captor.getValue().isHeadquarters()).isFalse();
    }

    @Test
    void shouldLancarExcecaoAoCriarComSlugDuplicado() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        CreateTenantUnitRequest request = new CreateTenantUnitRequest();
        request.setSlug("centro");

        when(tenantUnitRepository.findByTenantIdAndSlug(tenantId, "centro"))
                .thenReturn(Optional.of(new TenantUnit()));

        // Act + Assert
        assertThatThrownBy(() -> tenantUnitService.create(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.BAD_REQUEST);

        verify(tenantUnitRepository, never()).save(any());
    }

    @Test
    void shouldListarUnidadesDoTenant() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        TenantUnit u1 = new TenantUnit();
        TenantUnit u2 = new TenantUnit();
        when(tenantUnitRepository.findByTenantIdOrderByIsHeadquartersDescNameAsc(tenantId))
                .thenReturn(List.of(u1, u2));
        when(tenantUnitConverter.toResponse(any()))
                .thenReturn(TenantUnitResponse.builder().build());

        // Act
        List<TenantUnitResponse> result = tenantUnitService.findAllByTenant(tenantId);

        // Assert
        assertThat(result).hasSize(2);
    }

    @Test
    void shouldListarUnidadesAtivasDoTenant() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        TenantUnit u1 = new TenantUnit();
        when(tenantUnitRepository.findByTenantIdAndIsActiveTrueOrderByIsHeadquartersDescNameAsc(tenantId))
                .thenReturn(List.of(u1));
        when(tenantUnitConverter.toResponse(any()))
                .thenReturn(TenantUnitResponse.builder().build());

        // Act
        List<TenantUnitResponse> result = tenantUnitService.findActiveByTenant(tenantId);

        // Assert
        assertThat(result).hasSize(1);
    }

    @Test
    void shouldBuscarUnidadePorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        TenantUnit unit = new TenantUnit();
        unit.setTenantId(tenantId);

        when(tenantUnitRepository.findById(id)).thenReturn(Optional.of(unit));
        when(tenantUnitConverter.toResponse(unit))
                .thenReturn(TenantUnitResponse.builder().build());

        // Act
        TenantUnitResponse result = tenantUnitService.findById(id, tenantId);

        // Assert
        assertThat(result).isNotNull();
    }

    @Test
    void shouldLancarForbiddenAoAtualizarUnidadeDeOutroTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID outroTenantId = UUID.randomUUID();

        TenantUnit unit = new TenantUnit();
        unit.setTenantId(outroTenantId);

        when(tenantUnitRepository.findById(id)).thenReturn(Optional.of(unit));

        CreateTenantUnitRequest request = new CreateTenantUnitRequest();
        request.setName("X");

        // Act + Assert
        assertThatThrownBy(() -> tenantUnitService.update(id, tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(tenantUnitRepository, never()).save(any());
    }

    @Test
    void shouldAtualizarUnidadeDoMesmoTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        TenantUnit existing = new TenantUnit();
        existing.setTenantId(tenantId);
        existing.setSlug("centro");
        existing.setName("Antigo");

        CreateTenantUnitRequest request = new CreateTenantUnitRequest();
        request.setName("Novo");
        request.setSlug("centro");

        when(tenantUnitRepository.findById(id)).thenReturn(Optional.of(existing));
        when(tenantUnitRepository.save(existing)).thenReturn(existing);
        when(tenantUnitConverter.toResponse(existing))
                .thenReturn(TenantUnitResponse.builder().name("Novo").build());

        // Act
        TenantUnitResponse result = tenantUnitService.update(id, tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        verify(tenantUnitConverter).updateFromRequest(request, existing);
        verify(tenantUnitRepository).save(existing);
    }

    @Test
    void shouldFazerSoftDeleteAoRemoverUnidade() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        TenantUnit unit = new TenantUnit();
        unit.setTenantId(tenantId);
        unit.setActive(true);

        when(tenantUnitRepository.findById(id)).thenReturn(Optional.of(unit));

        // Act
        tenantUnitService.delete(id, tenantId);

        // Assert
        assertThat(unit.isActive()).isFalse();
        verify(tenantUnitRepository).save(unit);
    }

    @Test
    void shouldLancarForbiddenAoDeletarUnidadeDeOutroTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID outroTenantId = UUID.randomUUID();

        TenantUnit unit = new TenantUnit();
        unit.setTenantId(outroTenantId);
        unit.setActive(true);

        when(tenantUnitRepository.findById(id)).thenReturn(Optional.of(unit));

        // Act + Assert
        assertThatThrownBy(() -> tenantUnitService.delete(id, tenantId))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.FORBIDDEN);

        verify(tenantUnitRepository, never()).save(any());
    }
}
