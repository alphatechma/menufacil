package br.com.menufacil.service;

import br.com.menufacil.converter.PaymentConverter;
import br.com.menufacil.domain.enums.PaymentMethod;
import br.com.menufacil.domain.enums.PaymentStatus;
import br.com.menufacil.domain.models.PaymentTransaction;
import br.com.menufacil.dto.CreatePaymentRequest;
import br.com.menufacil.dto.PaymentResponse;
import br.com.menufacil.dto.UpdatePaymentStatusRequest;
import br.com.menufacil.repository.PaymentRepository;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PaymentServiceTest {

    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentConverter paymentConverter;

    @InjectMocks
    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldCriarPagamentoPixComStubQrCode() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();

        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setOrderId(orderId.toString());
        request.setMethod("pix");
        request.setAmount(new BigDecimal("25.50"));

        PaymentTransaction saved = new PaymentTransaction();
        saved.setId(UUID.randomUUID());
        saved.setTenantId(tenantId);
        saved.setOrderId(orderId);
        saved.setMethod(PaymentMethod.pix);
        saved.setStatus(PaymentStatus.pending);

        when(paymentRepository.save(any(PaymentTransaction.class))).thenReturn(saved);
        when(paymentConverter.toResponse(saved)).thenReturn(
                PaymentResponse.builder().id(saved.getId().toString()).method("pix").build());

        // Act
        PaymentResponse result = paymentService.create(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getMethod()).isEqualTo("pix");

        ArgumentCaptor<PaymentTransaction> captor = ArgumentCaptor.forClass(PaymentTransaction.class);
        verify(paymentRepository).save(captor.capture());
        PaymentTransaction captured = captor.getValue();
        assertThat(captured.getTenantId()).isEqualTo(tenantId);
        assertThat(captured.getOrderId()).isEqualTo(orderId);
        assertThat(captured.getMethod()).isEqualTo(PaymentMethod.pix);
        assertThat(captured.getStatus()).isEqualTo(PaymentStatus.pending);
        assertThat(captured.getPixQrCode()).isEqualTo("STUB_QR");
        assertThat(captured.getPixCopyPaste()).isEqualTo("STUB_COPYPASTE");
        assertThat(captured.getExternalId()).isNotBlank();
    }

    @Test
    void shouldLancarExcecaoAoCriarComMetodoInvalido() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        CreatePaymentRequest request = new CreatePaymentRequest();
        request.setOrderId(UUID.randomUUID().toString());
        request.setMethod("invalid_method");
        request.setAmount(new BigDecimal("10.00"));

        // Act + Assert
        assertThatThrownBy(() -> paymentService.create(tenantId, request))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldBuscarPagamentoPorIdQuandoTenantCorreto() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        PaymentTransaction entity = new PaymentTransaction();
        entity.setId(id);
        entity.setTenantId(tenantId);

        when(paymentRepository.findById(id)).thenReturn(Optional.of(entity));
        when(paymentConverter.toResponse(entity)).thenReturn(PaymentResponse.builder().build());

        // Act
        PaymentResponse result = paymentService.getById(id, tenantId);

        // Assert
        assertThat(result).isNotNull();
    }

    @Test
    void shouldLancarExcecaoAoBuscarPagamentoDeOutroTenant() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        UUID outroTenant = UUID.randomUUID();
        PaymentTransaction entity = new PaymentTransaction();
        entity.setId(id);
        entity.setTenantId(outroTenant);

        when(paymentRepository.findById(id)).thenReturn(Optional.of(entity));

        // Act + Assert
        assertThatThrownBy(() -> paymentService.getById(id, tenantId))
                .isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void shouldListarPagamentosDoPedidoFiltrandoPorTenant() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID orderId = UUID.randomUUID();

        PaymentTransaction p1 = new PaymentTransaction();
        p1.setTenantId(tenantId);
        PaymentTransaction p2 = new PaymentTransaction();
        p2.setTenantId(UUID.randomUUID()); // outro tenant

        when(paymentRepository.findByOrderId(orderId)).thenReturn(List.of(p1, p2));
        when(paymentConverter.toResponse(p1)).thenReturn(PaymentResponse.builder().build());

        // Act
        List<PaymentResponse> result = paymentService.listByOrder(orderId, tenantId);

        // Assert
        assertThat(result).hasSize(1);
    }

    @Test
    void shouldAtualizarStatusDoPagamento() {
        // Arrange
        UUID id = UUID.randomUUID();
        UUID tenantId = UUID.randomUUID();
        PaymentTransaction entity = new PaymentTransaction();
        entity.setId(id);
        entity.setTenantId(tenantId);
        entity.setStatus(PaymentStatus.pending);

        UpdatePaymentStatusRequest request = new UpdatePaymentStatusRequest();
        request.setStatus("approved");
        request.setExternalId("new-ext-id");

        when(paymentRepository.findById(id)).thenReturn(Optional.of(entity));
        when(paymentRepository.save(entity)).thenReturn(entity);
        when(paymentConverter.toResponse(entity)).thenReturn(PaymentResponse.builder().build());

        // Act
        PaymentResponse result = paymentService.updateStatus(id, tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(entity.getStatus()).isEqualTo(PaymentStatus.approved);
        assertThat(entity.getExternalId()).isEqualTo("new-ext-id");
    }

    @Test
    void shouldProcessarWebhookEAtualizarStatusPorExternalId() {
        // Arrange
        String externalId = "gateway-xyz-001";
        PaymentTransaction entity = new PaymentTransaction();
        entity.setId(UUID.randomUUID());
        entity.setTenantId(UUID.randomUUID());
        entity.setExternalId(externalId);
        entity.setStatus(PaymentStatus.pending);

        when(paymentRepository.findByExternalId(externalId)).thenReturn(Optional.of(entity));
        when(paymentRepository.save(entity)).thenReturn(entity);
        when(paymentConverter.toResponse(entity)).thenReturn(PaymentResponse.builder().build());

        // Act
        PaymentResponse result = paymentService.processWebhook(externalId, "approved");

        // Assert
        assertThat(result).isNotNull();
        assertThat(entity.getStatus()).isEqualTo(PaymentStatus.approved);
        verify(paymentRepository).save(entity);
    }
}
