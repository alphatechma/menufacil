package br.com.menufacil.service;

import br.com.menufacil.converter.PlanConverter;
import br.com.menufacil.domain.models.Plan;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreatePlanRequest;
import br.com.menufacil.dto.PlanResponse;
import br.com.menufacil.repository.PlanRepository;
import br.com.menufacil.repository.SystemModuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PlanServiceTest {

    @Mock private PlanRepository planRepository;
    @Mock private SystemModuleRepository systemModuleRepository;
    @Mock private PlanConverter planConverter;

    @InjectMocks
    private PlanService planService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldCriarPlano() {
        // Arrange
        CreatePlanRequest request = new CreatePlanRequest();
        request.setName("Plano Pro");
        request.setPrice(new BigDecimal("99.90"));

        Plan entity = new Plan();
        entity.setName("Plano Pro");
        Plan saved = new Plan();
        saved.setId(UUID.randomUUID());
        saved.setName("Plano Pro");
        PlanResponse response = PlanResponse.builder().name("Plano Pro").build();

        when(planConverter.toEntity(request)).thenReturn(entity);
        when(planRepository.save(entity)).thenReturn(saved);
        when(planConverter.toResponse(saved)).thenReturn(response);

        // Act
        PlanResponse result = planService.create(request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Plano Pro");
        verify(planRepository).save(entity);
    }

    @Test
    void shouldListarPlanos() {
        // Arrange
        Plan p1 = new Plan();
        when(planRepository.findAllByOrderByPriceAsc()).thenReturn(List.of(p1));
        when(planConverter.toResponse(any())).thenReturn(PlanResponse.builder().build());

        // Act
        List<PlanResponse> result = planService.findAll();

        // Assert
        assertThat(result).hasSize(1);
    }

    @Test
    void shouldBuscarPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        Plan entity = new Plan();
        when(planRepository.findById(id)).thenReturn(Optional.of(entity));
        when(planConverter.toResponse(entity)).thenReturn(PlanResponse.builder().build());

        // Act
        PlanResponse result = planService.findById(id);

        // Assert
        assertThat(result).isNotNull();
    }

    @Test
    void shouldLancarExcecaoQuandoIdNaoEncontradoNoBuscar() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(planRepository.findById(id)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> planService.findById(id))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldAtualizarPlano() {
        // Arrange
        UUID id = UUID.randomUUID();
        Plan existing = new Plan();
        existing.setName("Antigo");
        CreatePlanRequest request = new CreatePlanRequest();
        request.setName("Atualizado");
        request.setPrice(new BigDecimal("49.90"));

        when(planRepository.findById(id)).thenReturn(Optional.of(existing));
        when(planRepository.save(existing)).thenReturn(existing);
        when(planConverter.toResponse(existing)).thenReturn(PlanResponse.builder().build());

        // Act
        PlanResponse result = planService.update(id, request);

        // Assert
        assertThat(result).isNotNull();
        verify(planConverter).updateFromRequest(request, existing);
    }

    @Test
    void shouldLancarExcecaoAoAtualizarInexistente() {
        // Arrange
        UUID id = UUID.randomUUID();
        CreatePlanRequest request = new CreatePlanRequest();
        when(planRepository.findById(id)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> planService.update(id, request))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldDeletarPlano() {
        // Arrange
        UUID id = UUID.randomUUID();
        Plan entity = new Plan();
        when(planRepository.findById(id)).thenReturn(Optional.of(entity));

        // Act
        planService.delete(id);

        // Assert
        verify(planRepository).delete(entity);
    }

    @Test
    void shouldLancarExcecaoAoDeletarInexistente() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(planRepository.findById(id)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> planService.delete(id))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldAtribuirModulosAoPlano() {
        // Arrange
        UUID planId = UUID.randomUUID();
        UUID moduleId = UUID.randomUUID();
        Plan plan = new Plan();
        SystemModule module = new SystemModule();
        module.setId(moduleId);

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(systemModuleRepository.findAllById(anyList())).thenReturn(List.of(module));
        when(planRepository.save(plan)).thenReturn(plan);
        when(planConverter.toResponse(plan)).thenReturn(PlanResponse.builder().build());

        // Act
        PlanResponse result = planService.assignModules(planId, List.of(moduleId.toString()));

        // Assert
        assertThat(result).isNotNull();
        assertThat(plan.getModules()).hasSize(1);
        verify(planRepository).save(plan);
    }

    @Test
    void shouldLimparModulosQuandoListaVazia() {
        // Arrange
        UUID planId = UUID.randomUUID();
        Plan plan = new Plan();
        SystemModule existingModule = new SystemModule();
        existingModule.setId(UUID.randomUUID());
        plan.getModules().add(existingModule);

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(planRepository.save(plan)).thenReturn(plan);
        when(planConverter.toResponse(plan)).thenReturn(PlanResponse.builder().build());

        // Act
        PlanResponse result = planService.assignModules(planId, List.of());

        // Assert
        assertThat(result).isNotNull();
        assertThat(plan.getModules()).isEmpty();
    }

    @Test
    void shouldLancarExcecaoQuandoModuloNaoEncontrado() {
        // Arrange
        UUID planId = UUID.randomUUID();
        UUID moduleId = UUID.randomUUID();
        Plan plan = new Plan();

        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));
        when(systemModuleRepository.findAllById(anyList())).thenReturn(List.of());

        // Act + Assert
        assertThatThrownBy(() -> planService.assignModules(planId, List.of(moduleId.toString())))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldLancarExcecaoQuandoIdModuloInvalido() {
        // Arrange
        UUID planId = UUID.randomUUID();
        Plan plan = new Plan();
        when(planRepository.findById(planId)).thenReturn(Optional.of(plan));

        // Act + Assert
        assertThatThrownBy(() -> planService.assignModules(planId, List.of("not-a-uuid")))
                .isInstanceOf(ResponseStatusException.class);
    }
}
