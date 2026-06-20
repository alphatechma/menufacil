package br.com.menufacil.service;

import br.com.menufacil.converter.NotificationConverter;
import br.com.menufacil.domain.enums.NotificationChannel;
import br.com.menufacil.domain.enums.NotificationStatus;
import br.com.menufacil.domain.models.Notification;
import br.com.menufacil.dto.CreateNotificationRequest;
import br.com.menufacil.dto.NotificationResponse;
import br.com.menufacil.repository.NotificationRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @Mock private NotificationConverter notificationConverter;

    @InjectMocks
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldCriarNotificacaoComoPendente() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        CreateNotificationRequest request = new CreateNotificationRequest();
        request.setChannel("email");
        request.setRecipient("cliente@example.com");
        request.setContent("Pedido confirmado");

        Notification entity = new Notification();
        entity.setChannel(NotificationChannel.email);

        Notification saved = new Notification();
        saved.setId(UUID.randomUUID());
        saved.setStatus(NotificationStatus.pending);

        NotificationResponse response = NotificationResponse.builder()
                .id(saved.getId().toString())
                .status("pending")
                .build();

        when(notificationConverter.toEntity(request)).thenReturn(entity);
        when(notificationRepository.save(entity)).thenReturn(saved);
        when(notificationConverter.toResponse(saved)).thenReturn(response);

        // Act
        NotificationResponse result = notificationService.create(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo("pending");
        assertThat(entity.getTenantId()).isEqualTo(tenantId);
        assertThat(entity.getStatus()).isEqualTo(NotificationStatus.pending);
        verify(notificationRepository).save(entity);
    }

    @Test
    void shouldListarNotificacoesDoTenant() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        Notification n1 = new Notification();
        Notification n2 = new Notification();

        when(notificationRepository.findByTenantId(tenantId)).thenReturn(List.of(n1, n2));
        when(notificationConverter.toResponse(any())).thenReturn(NotificationResponse.builder().build());

        // Act
        List<NotificationResponse> result = notificationService.listByTenant(tenantId);

        // Assert
        assertThat(result).hasSize(2);
        verify(notificationRepository).findByTenantId(tenantId);
    }

    @Test
    void shouldBuscarNotificacaoPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        Notification entity = new Notification();
        entity.setId(id);

        when(notificationRepository.findById(id)).thenReturn(Optional.of(entity));
        when(notificationConverter.toResponse(entity)).thenReturn(NotificationResponse.builder().id(id.toString()).build());

        // Act
        NotificationResponse result = notificationService.getById(id);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(id.toString());
    }

    @Test
    void shouldLancarExcecaoQuandoGetByIdNaoEncontrado() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(notificationRepository.findById(id)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> notificationService.getById(id))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Notificação não encontrada");
    }

    @Test
    void shouldMarcarComoEnviadaValidandoTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID outroTenantId = UUID.randomUUID();

        Notification entityOutroTenant = new Notification();
        entityOutroTenant.setId(id);
        entityOutroTenant.setTenantId(outroTenantId);

        when(notificationRepository.findById(id)).thenReturn(Optional.of(entityOutroTenant));

        // Act + Assert - tenant errado dispara FORBIDDEN
        assertThatThrownBy(() -> notificationService.markAsSent(id, tenantId))
                .isInstanceOf(ResponseStatusException.class);

        // Arrange - tenant correto
        Notification entity = new Notification();
        entity.setId(id);
        entity.setTenantId(tenantId);
        entity.setStatus(NotificationStatus.pending);

        when(notificationRepository.findById(id)).thenReturn(Optional.of(entity));
        when(notificationRepository.save(entity)).thenReturn(entity);
        when(notificationConverter.toResponse(entity)).thenReturn(NotificationResponse.builder().status("sent").build());

        // Act
        NotificationResponse result = notificationService.markAsSent(id, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(entity.getStatus()).isEqualTo(NotificationStatus.sent);
        assertThat(entity.getSentAt()).isNotNull();
        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(NotificationStatus.sent);
    }

    @Test
    void shouldMarcarComoFalhadaValidandoTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID outroTenantId = UUID.randomUUID();

        Notification entityOutroTenant = new Notification();
        entityOutroTenant.setId(id);
        entityOutroTenant.setTenantId(outroTenantId);

        when(notificationRepository.findById(id)).thenReturn(Optional.of(entityOutroTenant));

        // Act + Assert - tenant errado dispara FORBIDDEN
        assertThatThrownBy(() -> notificationService.markAsFailed(id, tenantId))
                .isInstanceOf(ResponseStatusException.class);

        // Arrange - tenant correto
        Notification entity = new Notification();
        entity.setId(id);
        entity.setTenantId(tenantId);
        entity.setStatus(NotificationStatus.pending);

        when(notificationRepository.findById(id)).thenReturn(Optional.of(entity));
        when(notificationRepository.save(entity)).thenReturn(entity);
        when(notificationConverter.toResponse(entity)).thenReturn(NotificationResponse.builder().status("failed").build());

        // Act
        NotificationResponse result = notificationService.markAsFailed(id, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(entity.getStatus()).isEqualTo(NotificationStatus.failed);
        verify(notificationRepository).save(entity);
    }
}
