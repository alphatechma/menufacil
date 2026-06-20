package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreatePaymentRequest;
import br.com.menufacil.dto.PaymentResponse;
import br.com.menufacil.dto.UpdatePaymentStatusRequest;
import br.com.menufacil.service.PaymentService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaymentControllerTest {

    @Mock private PaymentService paymentService;

    @InjectMocks
    private PaymentController paymentController;

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
    void shouldCriarPagamento() {
        // Arrange
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setOrderId(UUID.randomUUID().toString());
        request.setMethod("pix");
        request.setAmount(new BigDecimal("30.00"));

        when(paymentService.create(eq(tenantId), any(CreatePaymentRequest.class)))
                .thenReturn(PaymentResponse.builder().build());

        // Act
        ResponseEntity<PaymentResponse> response = paymentController.create(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void shouldBuscarPagamentoPorId() {
        // Arrange
        UUID id = UUID.randomUUID();
        when(paymentService.getById(id, tenantId))
                .thenReturn(PaymentResponse.builder().build());

        // Act
        ResponseEntity<PaymentResponse> response = paymentController.getById(id);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void shouldListarPagamentosPorPedido() {
        // Arrange
        UUID orderId = UUID.randomUUID();
        when(paymentService.listByOrder(orderId, tenantId))
                .thenReturn(List.of(PaymentResponse.builder().build()));

        // Act
        ResponseEntity<List<PaymentResponse>> response = paymentController.listByOrder(orderId);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldAtualizarStatusDoPagamento() {
        // Arrange
        UUID id = UUID.randomUUID();
        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus("approved");

        when(paymentService.updateStatus(eq(id), eq(tenantId), any(UpdatePaymentStatusRequest.class)))
                .thenReturn(PaymentResponse.builder().build());

        // Act
        ResponseEntity<PaymentResponse> response = paymentController.updateStatus(id, request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
    }

    @Test
    void shouldProcessarWebhookPublico() {
        // Arrange
        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus("approved");
        request.setExternalId("gateway-001");

        when(paymentService.processWebhook("gateway-001", "approved"))
                .thenReturn(PaymentResponse.builder().build());

        // Act
        ResponseEntity<PaymentResponse> response = paymentController.webhook(request);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        verify(paymentService).processWebhook("gateway-001", "approved");
    }
}
