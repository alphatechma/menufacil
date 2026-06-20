package br.com.menufacil.controller.whatsapp;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.ConnectInstanceRequest;
import br.com.menufacil.dto.WhatsappInstanceResponse;
import br.com.menufacil.service.whatsapp.WhatsappInstanceService;
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

class WhatsappInstanceControllerTest {

    @Mock private WhatsappInstanceService instanceService;

    @InjectMocks
    private WhatsappInstanceController controller;

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
    void shouldListarInstanciasDoTenant() {
        // Arrange
        when(instanceService.listByTenant(tenantId))
                .thenReturn(List.of(WhatsappInstanceResponse.builder().build()));

        // Act
        ResponseEntity<List<WhatsappInstanceResponse>> response = controller.list();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldConectarInstancia() {
        // Arrange
        ConnectInstanceRequest request = new ConnectInstanceRequest();
        request.setInstanceName("nova-instancia");

        when(instanceService.connect(eq(tenantId), any(ConnectInstanceRequest.class)))
                .thenReturn(WhatsappInstanceResponse.builder()
                        .instanceName("nova-instancia").qrCode("qr-base64").build());

        // Act
        ResponseEntity<WhatsappInstanceResponse> response = controller.connect(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getInstanceName()).isEqualTo("nova-instancia");
        assertThat(response.getBody().getQrCode()).isEqualTo("qr-base64");
    }

    @Test
    void shouldDesconectarInstancia() {
        // Arrange
        when(instanceService.disconnect(tenantId, "instancia-1"))
                .thenReturn(WhatsappInstanceResponse.builder().instanceName("instancia-1").build());

        // Act
        ResponseEntity<WhatsappInstanceResponse> response = controller.disconnect("instancia-1");

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(instanceService).disconnect(tenantId, "instancia-1");
    }

    @Test
    void shouldConsultarStatusDeInstancia() {
        // Arrange
        when(instanceService.getStatus(tenantId, "instancia-1"))
                .thenReturn(WhatsappInstanceResponse.builder().instanceName("instancia-1").build());

        // Act
        ResponseEntity<WhatsappInstanceResponse> response = controller.status("instancia-1");

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getInstanceName()).isEqualTo("instancia-1");
    }
}
