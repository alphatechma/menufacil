package br.com.menufacil.service;

import br.com.menufacil.converter.PermissionConverter;
import br.com.menufacil.converter.RoleConverter;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.Role;
import br.com.menufacil.dto.CreateRoleRequest;
import br.com.menufacil.dto.PermissionResponse;
import br.com.menufacil.dto.RoleResponse;
import br.com.menufacil.repository.PermissionRepository;
import br.com.menufacil.repository.RoleRepository;
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

class RoleServiceTest {

    @Mock private RoleRepository roleRepository;
    @Mock private PermissionRepository permissionRepository;
    @Mock private RoleConverter roleConverter;
    @Mock private PermissionConverter permissionConverter;
    @Mock private AuditLogService auditLogService;

    @InjectMocks
    private RoleService roleService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldCriarCargoComPermissoes() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID permissionId = UUID.randomUUID();

        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Atendente");
        request.setDescription("Atende clientes");
        request.setPermissionIds(List.of(permissionId.toString()));

        Permission permission = new Permission();
        permission.setId(permissionId);
        permission.setKey("order:read");

        Role entity = new Role();
        entity.setName("Atendente");

        Role saved = new Role();
        saved.setId(UUID.randomUUID());
        saved.setName("Atendente");
        saved.setTenantId(tenantId);

        RoleResponse response = RoleResponse.builder().name("Atendente").build();

        when(roleConverter.toEntity(request)).thenReturn(entity);
        when(permissionRepository.findAllById(List.of(permissionId))).thenReturn(List.of(permission));
        when(roleRepository.save(any(Role.class))).thenReturn(saved);
        when(roleConverter.toResponse(saved)).thenReturn(response);

        // Act
        RoleResponse result = roleService.create(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Atendente");
        ArgumentCaptor<Role> captor = ArgumentCaptor.forClass(Role.class);
        verify(roleRepository).save(captor.capture());
        Role savedRole = captor.getValue();
        assertThat(savedRole.getTenantId()).isEqualTo(tenantId);
        assertThat(savedRole.getPermissions()).hasSize(1);
    }

    @Test
    void shouldListarCargosDoTenant() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setName("Gerente");
        role.setTenantId(tenantId);

        when(roleRepository.findByTenantIdOrderByNameAsc(tenantId)).thenReturn(List.of(role));
        when(roleConverter.toResponse(any())).thenReturn(RoleResponse.builder().name("Gerente").build());

        // Act
        List<RoleResponse> result = roleService.findAllByTenant(tenantId);

        // Assert
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Gerente");
    }

    @Test
    void shouldBuscarCargoPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        Role role = new Role();
        role.setId(id);
        role.setTenantId(tenantId);
        role.setName("Caixa");

        when(roleRepository.findById(id)).thenReturn(Optional.of(role));
        when(roleConverter.toResponse(role)).thenReturn(RoleResponse.builder().name("Caixa").build());

        // Act
        RoleResponse result = roleService.findById(id, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Caixa");
    }

    @Test
    void shouldLancarExcecaoQuandoBuscarCargoInexistente() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        when(roleRepository.findById(id)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> roleService.findById(id, tenantId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cargo não encontrado");
    }

    @Test
    void shouldListarTodasPermissoes() {
        // Arrange
        Permission permission = new Permission();
        permission.setId(UUID.randomUUID());
        permission.setKey("product:create");

        when(permissionRepository.findAllByOrderByKeyAsc()).thenReturn(List.of(permission));
        when(permissionConverter.toResponse(permission))
                .thenReturn(PermissionResponse.builder().key("product:create").build());

        // Act
        List<PermissionResponse> result = roleService.findAllPermissions();

        // Assert
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getKey()).isEqualTo("product:create");
    }

    @Test
    void shouldAtualizarCargo() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        Role existing = new Role();
        existing.setId(id);
        existing.setTenantId(tenantId);
        existing.setName("Antigo");
        existing.setSystemDefault(false);

        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Novo");
        request.setPermissionIds(List.of());

        when(roleRepository.findById(id)).thenReturn(Optional.of(existing));
        when(roleRepository.save(existing)).thenReturn(existing);
        when(roleConverter.toResponse(existing)).thenReturn(RoleResponse.builder().name("Novo").build());

        // Act
        RoleResponse result = roleService.update(id, tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        verify(roleConverter).updateFromRequest(request, existing);
        verify(roleRepository).save(existing);
    }

    @Test
    void shouldLancarExcecaoAoAtualizarDeOutroTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID outroTenant = UUID.randomUUID();

        Role existing = new Role();
        existing.setId(id);
        existing.setTenantId(outroTenant);
        existing.setName("Cargo");

        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Novo");

        when(roleRepository.findById(id)).thenReturn(Optional.of(existing));

        // Act + Assert
        assertThatThrownBy(() -> roleService.update(id, tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Acesso negado");

        verify(roleRepository, never()).save(any());
    }

    @Test
    void shouldLancarExcecaoAoAtualizarCargoPadraoSistema() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        Role existing = new Role();
        existing.setId(id);
        existing.setTenantId(tenantId);
        existing.setName("Admin");
        existing.setSystemDefault(true);

        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Novo");

        when(roleRepository.findById(id)).thenReturn(Optional.of(existing));

        // Act + Assert
        assertThatThrownBy(() -> roleService.update(id, tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("padrão do sistema");

        verify(roleRepository, never()).save(any());
    }

    @Test
    void shouldDeletarCargo() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        Role role = new Role();
        role.setId(id);
        role.setTenantId(tenantId);
        role.setSystemDefault(false);

        when(roleRepository.findById(id)).thenReturn(Optional.of(role));

        // Act
        roleService.delete(id, tenantId);

        // Assert
        verify(roleRepository).delete(role);
    }

    @Test
    void shouldLancarExcecaoAoDeletarDeOutroTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID outroTenant = UUID.randomUUID();

        Role role = new Role();
        role.setId(id);
        role.setTenantId(outroTenant);

        when(roleRepository.findById(id)).thenReturn(Optional.of(role));

        // Act + Assert
        assertThatThrownBy(() -> roleService.delete(id, tenantId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Acesso negado");

        verify(roleRepository, never()).delete(any(Role.class));
    }

    @Test
    void shouldLancarExcecaoAoDeletarCargoPadraoSistema() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();

        Role role = new Role();
        role.setId(id);
        role.setTenantId(tenantId);
        role.setSystemDefault(true);

        when(roleRepository.findById(id)).thenReturn(Optional.of(role));

        // Act + Assert
        assertThatThrownBy(() -> roleService.delete(id, tenantId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("padrão do sistema");

        verify(roleRepository, never()).delete(any(Role.class));
    }

    @Test
    void shouldLancarExcecaoQuandoPermissaoNaoEncontrada() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID permissionId = UUID.randomUUID();

        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Atendente");
        request.setPermissionIds(List.of(permissionId.toString()));

        Role entity = new Role();
        entity.setName("Atendente");

        when(roleConverter.toEntity(request)).thenReturn(entity);
        when(permissionRepository.findAllById(List.of(permissionId))).thenReturn(List.of());

        // Act + Assert
        assertThatThrownBy(() -> roleService.create(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("permissões");

        verify(roleRepository, never()).save(any());
    }

    @Test
    void shouldLancarBadRequestQuandoPermissionIdInvalido() {
        // Arrange
        UUID tenantId = UUID.randomUUID();

        CreateRoleRequest request = new CreateRoleRequest();
        request.setName("Atendente");
        request.setPermissionIds(List.of("id-invalido"));

        Role entity = new Role();
        entity.setName("Atendente");

        when(roleConverter.toEntity(request)).thenReturn(entity);

        // Act + Assert
        assertThatThrownBy(() -> roleService.create(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }
}
