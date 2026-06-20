package br.com.menufacil.service;

import br.com.menufacil.converter.UserConverter;
import br.com.menufacil.domain.enums.UserRole;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.dto.CreateUserRequest;
import br.com.menufacil.dto.UpdateUserRequest;
import br.com.menufacil.dto.UserResponse;
import br.com.menufacil.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserConverter userConverter;

    @InjectMocks
    private UserService userService;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
    }

    @Test
    void shouldCriarUsuarioComSenhaHasheada() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest();
        request.setName("João");
        request.setEmail("joao@menufacil.com");
        request.setPassword("segredo123");
        request.setSystemRole(UserRole.cashier);

        User entity = new User();
        entity.setEmail("joao@menufacil.com");

        User saved = new User();
        saved.setId(UUID.randomUUID());
        saved.setEmail("joao@menufacil.com");

        UserResponse response = UserResponse.builder().email("joao@menufacil.com").build();

        when(userRepository.existsByEmailAndTenantId("joao@menufacil.com", tenantId)).thenReturn(false);
        when(userConverter.toEntity(request)).thenReturn(entity);
        when(userRepository.save(any(User.class))).thenReturn(saved);
        when(userConverter.toResponse(saved)).thenReturn(response);

        // Act
        UserResponse result = userService.create(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("joao@menufacil.com");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        User captured = captor.getValue();
        assertThat(captured.getTenantId()).isEqualTo(tenantId);
        assertThat(captured.getPasswordHash()).isNotBlank();
        assertThat(captured.getPasswordHash()).isNotEqualTo("segredo123");
        assertThat(captured.isActive()).isTrue();
    }

    @Test
    void shouldLancarConflictAoCriarComEmailDuplicado() {
        // Arrange
        CreateUserRequest request = new CreateUserRequest();
        request.setEmail("dup@menufacil.com");
        request.setPassword("segredo123");

        when(userRepository.existsByEmailAndTenantId("dup@menufacil.com", tenantId)).thenReturn(true);

        // Act + Assert
        assertThatThrownBy(() -> userService.create(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("E-mail já está em uso");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldListarUsuariosDoTenant() {
        // Arrange
        User u1 = new User();
        User u2 = new User();
        when(userRepository.findByTenantIdOrderByNameAsc(tenantId)).thenReturn(List.of(u1, u2));
        when(userConverter.toResponse(any(User.class))).thenReturn(UserResponse.builder().build());

        // Act
        List<UserResponse> result = userService.findAllByTenant(tenantId);

        // Assert
        assertThat(result).hasSize(2);
    }

    @Test
    void shouldBuscarUsuarioPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        User entity = new User();
        entity.setTenantId(tenantId);

        when(userRepository.findById(id)).thenReturn(Optional.of(entity));
        when(userConverter.toResponse(entity)).thenReturn(UserResponse.builder().build());

        // Act
        UserResponse result = userService.findById(id, tenantId);

        // Assert
        assertThat(result).isNotNull();
    }

    @Test
    void shouldLancarNotFoundQuandoIdNaoExiste() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> userService.findById(id, tenantId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Usuário não encontrado");
    }

    @Test
    void shouldAtualizarUsuarioValidandoTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        User existing = new User();
        existing.setTenantId(tenantId);
        existing.setEmail("joao@menufacil.com");

        UpdateUserRequest request = new UpdateUserRequest();
        request.setName("Atualizado");

        when(userRepository.findById(id)).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);
        when(userConverter.toResponse(existing)).thenReturn(UserResponse.builder().build());

        // Act
        UserResponse result = userService.update(id, tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        verify(userConverter).updateFromRequest(request, existing);
        verify(userRepository).save(existing);
    }

    @Test
    void shouldNegarUpdateQuandoTenantNaoBate() {
        // Arrange
        UUID id = UUID.randomUUID();
        User outroTenant = new User();
        outroTenant.setTenantId(UUID.randomUUID());

        when(userRepository.findById(id)).thenReturn(Optional.of(outroTenant));

        // Act + Assert
        assertThatThrownBy(() -> userService.update(id, tenantId, new UpdateUserRequest()))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Acesso negado");

        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void shouldFazerSoftDeleteValidandoTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        User existing = new User();
        existing.setTenantId(tenantId);
        existing.setActive(true);

        when(userRepository.findById(id)).thenReturn(Optional.of(existing));
        when(userRepository.save(existing)).thenReturn(existing);

        // Act
        userService.delete(id, tenantId);

        // Assert
        assertThat(existing.isActive()).isFalse();
        verify(userRepository).save(existing);
    }

    @Test
    void shouldNegarDeleteQuandoTenantNaoBate() {
        // Arrange
        UUID id = UUID.randomUUID();
        User outroTenant = new User();
        outroTenant.setTenantId(UUID.randomUUID());

        when(userRepository.findById(id)).thenReturn(Optional.of(outroTenant));

        // Act + Assert
        assertThatThrownBy(() -> userService.delete(id, tenantId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Acesso negado");

        verify(userRepository, never()).save(any(User.class));
    }
}
