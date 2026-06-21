package br.com.menufacil.service;

import br.com.menufacil.converter.PermissionConverter;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.SystemModule;
import br.com.menufacil.dto.CreatePermissionRequest;
import br.com.menufacil.dto.PermissionResponse;
import br.com.menufacil.repository.PermissionRepository;
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

class PermissionServiceTest {

    @Mock private PermissionRepository permissionRepository;
    @Mock private SystemModuleRepository systemModuleRepository;
    @Mock private PermissionConverter permissionConverter;
    @Mock private AuditLogService auditLogService;

    @InjectMocks
    private PermissionService permissionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldCriarPermissao() {
        // Arrange
        UUID moduleId = UUID.randomUUID();
        CreatePermissionRequest request = new CreatePermissionRequest();
        request.setKey("product:create");
        request.setName("Criar Produto");
        request.setModuleId(moduleId);

        SystemModule module = new SystemModule();
        module.setId(moduleId);

        Permission entity = new Permission();
        entity.setKey("product:create");

        Permission saved = new Permission();
        saved.setId(UUID.randomUUID());
        saved.setKey("product:create");

        PermissionResponse response = PermissionResponse.builder().key("product:create").build();

        when(permissionRepository.existsByKey("product:create")).thenReturn(false);
        when(permissionConverter.toEntity(request)).thenReturn(entity);
        when(systemModuleRepository.findById(moduleId)).thenReturn(Optional.of(module));
        when(permissionRepository.save(entity)).thenReturn(saved);
        when(permissionConverter.toResponse(saved)).thenReturn(response);

        // Act
        PermissionResponse result = permissionService.create(request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getKey()).isEqualTo("product:create");
        assertThat(entity.getModule()).isEqualTo(module);
        verify(permissionRepository).save(entity);
    }

    @Test
    void shouldLancarExcecaoAoCriarComChaveDuplicada() {
        // Arrange
        CreatePermissionRequest request = new CreatePermissionRequest();
        request.setKey("product:create");
        when(permissionRepository.existsByKey("product:create")).thenReturn(true);

        // Act + Assert
        assertThatThrownBy(() -> permissionService.create(request))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldListarPermissoesSemFiltro() {
        // Arrange
        Permission p1 = new Permission();
        when(permissionRepository.findAllByOrderByKeyAsc()).thenReturn(List.of(p1));
        when(permissionConverter.toResponse(any())).thenReturn(PermissionResponse.builder().build());

        // Act
        List<PermissionResponse> result = permissionService.findAll(null);

        // Assert
        assertThat(result).hasSize(1);
        verify(permissionRepository).findAllByOrderByKeyAsc();
    }

    @Test
    void shouldListarPermissoesFiltrandoPorModulo() {
        // Arrange
        UUID moduleId = UUID.randomUUID();
        Permission p1 = new Permission();
        when(permissionRepository.findByModuleIdOrderByKeyAsc(moduleId)).thenReturn(List.of(p1));
        when(permissionConverter.toResponse(any())).thenReturn(PermissionResponse.builder().build());

        // Act
        List<PermissionResponse> result = permissionService.findAll(moduleId);

        // Assert
        assertThat(result).hasSize(1);
        verify(permissionRepository).findByModuleIdOrderByKeyAsc(moduleId);
    }

    @Test
    void shouldBuscarPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        Permission entity = new Permission();
        when(permissionRepository.findById(id)).thenReturn(Optional.of(entity));
        when(permissionConverter.toResponse(entity)).thenReturn(PermissionResponse.builder().build());

        // Act
        PermissionResponse result = permissionService.findById(id);

        // Assert
        assertThat(result).isNotNull();
    }

    @Test
    void shouldLancarExcecaoQuandoIdNaoEncontrado() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(permissionRepository.findById(id)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> permissionService.findById(id))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldAtualizarPermissao() {
        // Arrange
        UUID id = UUID.randomUUID();
        Permission existing = new Permission();
        existing.setKey("product:create");

        CreatePermissionRequest request = new CreatePermissionRequest();
        request.setKey("product:create");
        request.setName("Criar Produto Atualizado");

        when(permissionRepository.findById(id)).thenReturn(Optional.of(existing));
        when(permissionRepository.save(existing)).thenReturn(existing);
        when(permissionConverter.toResponse(existing)).thenReturn(PermissionResponse.builder().build());

        // Act
        PermissionResponse result = permissionService.update(id, request);

        // Assert
        assertThat(result).isNotNull();
        verify(permissionConverter).updateFromRequest(request, existing);
        verify(permissionRepository).save(existing);
    }

    @Test
    void shouldLancarExcecaoAoAtualizarComChaveJaExistente() {
        // Arrange
        UUID id = UUID.randomUUID();
        Permission existing = new Permission();
        existing.setKey("product:create");

        CreatePermissionRequest request = new CreatePermissionRequest();
        request.setKey("product:update");

        when(permissionRepository.findById(id)).thenReturn(Optional.of(existing));
        when(permissionRepository.existsByKey("product:update")).thenReturn(true);

        // Act + Assert
        assertThatThrownBy(() -> permissionService.update(id, request))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldDeletarPermissao() {
        // Arrange
        UUID id = UUID.randomUUID();
        Permission entity = new Permission();
        when(permissionRepository.findById(id)).thenReturn(Optional.of(entity));

        // Act
        permissionService.delete(id);

        // Assert
        verify(permissionRepository).delete(entity);
    }

    @Test
    void shouldLancarExcecaoAoDeletarPermissaoInexistente() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(permissionRepository.findById(id)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> permissionService.delete(id))
                .isInstanceOf(ResponseStatusException.class);
    }
}
