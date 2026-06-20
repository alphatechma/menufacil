package br.com.menufacil.service;

import br.com.menufacil.converter.SystemModuleConverter;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreateSystemModuleRequest;
import br.com.menufacil.dto.SystemModuleResponse;
import br.com.menufacil.repository.SystemModuleRepository;
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

class SystemModuleServiceTest {

    @Mock private SystemModuleRepository systemModuleRepository;
    @Mock private SystemModuleConverter systemModuleConverter;

    @InjectMocks
    private SystemModuleService systemModuleService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldCriarModuloDoSistema() {
        // Arrange
        CreateSystemModuleRequest request = new CreateSystemModuleRequest();
        request.setKey("kds");
        request.setName("KDS");

        SystemModule entity = new SystemModule();
        entity.setKey("kds");
        SystemModule saved = new SystemModule();
        saved.setId(UUID.randomUUID());
        saved.setKey("kds");
        SystemModuleResponse response = SystemModuleResponse.builder().key("kds").build();

        when(systemModuleRepository.existsByKey("kds")).thenReturn(false);
        when(systemModuleConverter.toEntity(request)).thenReturn(entity);
        when(systemModuleRepository.save(entity)).thenReturn(saved);
        when(systemModuleConverter.toResponse(saved)).thenReturn(response);

        // Act
        SystemModuleResponse result = systemModuleService.create(request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getKey()).isEqualTo("kds");
        verify(systemModuleRepository).save(entity);
    }

    @Test
    void shouldLancarExcecaoAoCriarComChaveDuplicada() {
        // Arrange
        CreateSystemModuleRequest request = new CreateSystemModuleRequest();
        request.setKey("kds");
        when(systemModuleRepository.existsByKey("kds")).thenReturn(true);

        // Act + Assert
        assertThatThrownBy(() -> systemModuleService.create(request))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldListarModulos() {
        // Arrange
        SystemModule m1 = new SystemModule();
        when(systemModuleRepository.findAllByOrderByNameAsc()).thenReturn(List.of(m1));
        when(systemModuleConverter.toResponse(any())).thenReturn(SystemModuleResponse.builder().build());

        // Act
        List<SystemModuleResponse> result = systemModuleService.findAll();

        // Assert
        assertThat(result).hasSize(1);
    }

    @Test
    void shouldBuscarPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        SystemModule entity = new SystemModule();
        when(systemModuleRepository.findById(id)).thenReturn(Optional.of(entity));
        when(systemModuleConverter.toResponse(entity)).thenReturn(SystemModuleResponse.builder().build());

        // Act
        SystemModuleResponse result = systemModuleService.findById(id);

        // Assert
        assertThat(result).isNotNull();
    }

    @Test
    void shouldLancarExcecaoQuandoIdNaoEncontrado() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(systemModuleRepository.findById(id)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> systemModuleService.findById(id))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldAtualizarModulo() {
        // Arrange
        UUID id = UUID.randomUUID();
        SystemModule existing = new SystemModule();
        existing.setKey("kds");
        CreateSystemModuleRequest request = new CreateSystemModuleRequest();
        request.setKey("kds");
        request.setName("KDS Updated");

        when(systemModuleRepository.findById(id)).thenReturn(Optional.of(existing));
        when(systemModuleRepository.save(existing)).thenReturn(existing);
        when(systemModuleConverter.toResponse(existing)).thenReturn(SystemModuleResponse.builder().build());

        // Act
        SystemModuleResponse result = systemModuleService.update(id, request);

        // Assert
        assertThat(result).isNotNull();
        verify(systemModuleConverter).updateFromRequest(request, existing);
    }

    @Test
    void shouldDeletarModulo() {
        // Arrange
        UUID id = UUID.randomUUID();
        SystemModule entity = new SystemModule();
        when(systemModuleRepository.findById(id)).thenReturn(Optional.of(entity));

        // Act
        systemModuleService.delete(id);

        // Assert
        verify(systemModuleRepository).delete(entity);
    }
}
