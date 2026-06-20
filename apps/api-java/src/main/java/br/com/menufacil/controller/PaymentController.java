package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreatePaymentRequest;
import br.com.menufacil.dto.PaymentResponse;
import br.com.menufacil.dto.UpdatePaymentStatusRequest;
import br.com.menufacil.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Pagamentos", description = "Gerenciamento de transações de pagamento")
@RestController
@RequestMapping("/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Criar transação de pagamento (admin/cliente)")
    @PostMapping
    public ResponseEntity<PaymentResponse> create(@Valid @RequestBody CreatePaymentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paymentService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Buscar pagamento por ID (admin)")
    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar pagamentos de um pedido (admin)")
    @GetMapping("/order/{orderId}")
    public ResponseEntity<List<PaymentResponse>> listByOrder(@PathVariable UUID orderId) {
        return ResponseEntity.ok(paymentService.listByOrder(orderId, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Atualizar status do pagamento (admin)")
    @PutMapping("/{id}/status")
    public ResponseEntity<PaymentResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdatePaymentStatusRequest request) {
        return ResponseEntity.ok(
                paymentService.updateStatus(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Webhook público para atualização de status pelo gateway")
    @PostMapping("/webhook")
    public ResponseEntity<PaymentResponse> webhook(@Valid @RequestBody UpdatePaymentStatusRequest request) {
        // TODO: validar assinatura/secret do gateway (HMAC) antes de processar
        return ResponseEntity.ok(
                paymentService.processWebhook(request.getExternalId(), request.getStatus()));
    }
}
