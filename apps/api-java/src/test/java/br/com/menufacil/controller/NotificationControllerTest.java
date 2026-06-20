package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateNotificationRequest;
import br.com.menufacil.dto.NotificationResponse;
import br.com.menufacil.service.NotificationService;
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

class NotificationControllerTest {

    @Mock private NotificationService notificationService;

    @InjectMocks
    private NotificationController notificationController;

    private final UUID tenantId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        TenantContext.setCurrentTenant("tenant-test", tenantId.toString());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldCriarNotificacao() {
        // Arrange
        CreateNotificationRequest request = new CreateNotificationRequest();
        request.setChannel("email");
        request.setRecipient("cliente@example.com");
        request.setContent("Pedido confirmado");

        when(notificationService.create(eq(tenantId), any(CreateNotificationRequest.class)))
                .thenReturn(NotificationResponse.builder().status("pending").build());

        // Act
        ResponseEntity<NotificationResponse> response = notificationController.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo("pending");
        verify(notificationService).create(tenantId, request);
    }

    @Test
    void shouldListarNotificacoes() {
        // Arrange
        when(notificationService.listByTenant(tenantId))
                .thenReturn(List.of(NotificationResponse.builder().build(), NotificationResponse.builder().build()));

        // Act
        ResponseEntity<List<NotificationResponse>> response = notificationController.list();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(2);
    }

    @Test
    void shouldBuscarPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(notificationService.getById(id))
                .thenReturn(NotificationResponse.builder().id(id.toString()).build());

        // Act
        ResponseEntity<NotificationResponse> response = notificationController.getById(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(id.toString());
    }
}
