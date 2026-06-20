package br.com.menufacil.service;

import br.com.menufacil.converter.PaymentConverter;
import br.com.menufacil.domain.enums.PaymentMethod;
import br.com.menufacil.domain.enums.PaymentStatus;
import br.com.menufacil.domain.models.PaymentTransaction;
import br.com.menufacil.dto.CreatePaymentRequest;
import br.com.menufacil.dto.PaymentResponse;
import br.com.menufacil.dto.UpdatePaymentStatusRequest;
import br.com.menufacil.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentConverter paymentConverter;

    public PaymentResponse getById(UUID id, UUID tenantId) {
        PaymentTransaction payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Pagamento não encontrado"));

        validateTenant(payment, tenantId);
        return paymentConverter.toResponse(payment);
    }

    public List<PaymentResponse> listByOrder(UUID orderId, UUID tenantId) {
        return paymentRepository.findByOrderId(orderId).stream()
                .filter(p -> p.getTenantId().equals(tenantId))
                .map(paymentConverter::toResponse)
                .toList();
    }

    @Transactional
    public PaymentResponse create(UUID tenantId, CreatePaymentRequest request) {
        PaymentMethod method = parseMethod(request.getMethod());

        PaymentTransaction payment = new PaymentTransaction();
        payment.setTenantId(tenantId);
        payment.setOrderId(UUID.fromString(request.getOrderId()));
        payment.setMethod(method);
        payment.setAmount(request.getAmount());
        payment.setStatus(PaymentStatus.pending);

        // TODO: integrar com gateway real (Stripe, MercadoPago) — gerar externalId real
        payment.setExternalId(UUID.randomUUID().toString());

        if (method == PaymentMethod.pix) {
            // TODO: solicitar QR Code real ao gateway PIX
            payment.setPixQrCode("STUB_QR");
            payment.setPixCopyPaste("STUB_COPYPASTE");
        }

        payment = paymentRepository.save(payment);
        log.info("Pagamento criado: {} para pedido {} no tenant {}",
                payment.getId(), payment.getOrderId(), tenantId);
        return paymentConverter.toResponse(payment);
    }

    @Transactional
    public PaymentResponse updateStatus(UUID id, UUID tenantId, UpdatePaymentStatusRequest request) {
        PaymentTransaction payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Pagamento não encontrado"));

        validateTenant(payment, tenantId);

        PaymentStatus newStatus = parseStatus(request.getStatus());
        payment.setStatus(newStatus);

        if (request.getExternalId() != null && !request.getExternalId().isBlank()) {
            payment.setExternalId(request.getExternalId());
        }

        payment = paymentRepository.save(payment);
        log.info("Status do pagamento {} atualizado para {} no tenant {}",
                id, newStatus, tenantId);
        return paymentConverter.toResponse(payment);
    }

    @Transactional
    public PaymentResponse processWebhook(String externalId, String status) {
        // TODO: validar assinatura/secret do gateway (HMAC) antes de processar
        PaymentTransaction payment = paymentRepository.findByExternalId(externalId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Pagamento não encontrado para o externalId informado"));

        PaymentStatus newStatus = parseStatus(status);
        payment.setStatus(newStatus);
        payment = paymentRepository.save(payment);

        log.info("Webhook processado: pagamento {} atualizado para {} via externalId {}",
                payment.getId(), newStatus, externalId);
        return paymentConverter.toResponse(payment);
    }

    private void validateTenant(PaymentTransaction payment, UUID tenantId) {
        if (!payment.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }

    private PaymentMethod parseMethod(String method) {
        try {
            return PaymentMethod.valueOf(method);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Método de pagamento inválido: " + method);
        }
    }

    private PaymentStatus parseStatus(String status) {
        try {
            return PaymentStatus.valueOf(status);
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Status de pagamento inválido: " + status);
        }
    }
}
