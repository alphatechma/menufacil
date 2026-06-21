package br.com.menufacil.service;

import br.com.menufacil.config.observability.MetricsService;
import br.com.menufacil.converter.PaymentConverter;
import br.com.menufacil.domain.enums.PaymentMethod;
import br.com.menufacil.domain.enums.PaymentStatus;
import br.com.menufacil.domain.models.Customer;
import br.com.menufacil.domain.models.Order;
import br.com.menufacil.domain.models.PaymentTransaction;
import br.com.menufacil.dto.CreateNotificationRequest;
import br.com.menufacil.dto.CreatePaymentRequest;
import br.com.menufacil.dto.PaymentResponse;
import br.com.menufacil.dto.UpdatePaymentStatusRequest;
import br.com.menufacil.repository.CustomerRepository;
import br.com.menufacil.repository.OrderRepository;
import br.com.menufacil.repository.PaymentRepository;
import io.opentelemetry.instrumentation.annotations.SpanAttribute;
import io.opentelemetry.instrumentation.annotations.WithSpan;
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
    private final OrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final NotificationService notificationService;
    private final MetricsService metricsService;

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
        PaymentStatus oldStatus = payment.getStatus();
        payment.setStatus(newStatus);

        if (request.getExternalId() != null && !request.getExternalId().isBlank()) {
            payment.setExternalId(request.getExternalId());
        }

        payment = paymentRepository.save(payment);
        log.info("Status do pagamento {} atualizado para {} no tenant {}",
                id, newStatus, tenantId);

        // Notificar customer quando o pagamento muda para approved
        if (newStatus == PaymentStatus.approved && oldStatus != PaymentStatus.approved) {
            notifyCustomerPaymentApproved(payment);
        }

        return paymentConverter.toResponse(payment);
    }

    @Transactional
    @WithSpan("payment.processWebhook")
    public PaymentResponse processWebhook(
            @SpanAttribute("payment.externalId") String externalId,
            @SpanAttribute("payment.status") String status) {
        // TODO: validar assinatura/secret do gateway (HMAC) antes de processar
        PaymentTransaction payment;
        try {
            payment = paymentRepository.findByExternalId(externalId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Pagamento não encontrado para o externalId informado"));
        } catch (ResponseStatusException e) {
            metricsService.incrementPaymentWebhook("not_found");
            throw e;
        }

        PaymentStatus newStatus = parseStatus(status);
        payment.setStatus(newStatus);
        payment = paymentRepository.save(payment);

        metricsService.incrementPaymentWebhook(newStatus.name());

        log.info("Webhook processado: pagamento {} atualizado para {} via externalId {}",
                payment.getId(), newStatus, externalId);

        // Notificar customer via WhatsApp quando o pagamento é aprovado
        if (newStatus == PaymentStatus.approved) {
            notifyCustomerPaymentApproved(payment);
        }

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

    /**
     * Notifica o customer via WhatsApp que o pagamento foi aprovado.
     * Silenciosa — não interrompe a operação principal.
     */
    private void notifyCustomerPaymentApproved(PaymentTransaction payment) {
        try {
            if (payment == null || payment.getOrderId() == null) return;
            Order order = orderRepository.findById(payment.getOrderId()).orElse(null);
            if (order == null || order.getCustomerId() == null) return;

            Customer customer = customerRepository.findById(order.getCustomerId()).orElse(null);
            if (customer == null) return;

            String phone = sanitizePhoneForWhatsApp(customer.getPhone());
            if (phone == null) return;

            String content = String.format(
                    "Pagamento confirmado! Seu pedido #%d entrou em preparação.",
                    order.getOrderNumber() != null ? order.getOrderNumber() : 0);

            agendarNotificacao(payment.getTenantId(), "whatsapp", phone, content, order.getId());
        } catch (Exception e) {
            log.warn("Falha ao notificar customer sobre pagamento aprovado: {}", e.getMessage());
        }
    }

    private String sanitizePhoneForWhatsApp(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("\\D", "");
        if (digits.isBlank()) return null;
        if (!digits.startsWith("55")) {
            digits = "55" + digits;
        }
        return digits;
    }

    private void agendarNotificacao(UUID tenantId, String channel, String recipient, String content, UUID orderId) {
        try {
            CreateNotificationRequest req = new CreateNotificationRequest();
            req.setChannel(channel);
            req.setRecipient(recipient);
            req.setContent(content);
            if (orderId != null) req.setOrderId(orderId.toString());
            notificationService.create(tenantId, req);
            log.info("Notificação agendada: orderId={} canal={}", orderId, channel);
        } catch (Exception e) {
            log.warn("Falha agendando notificação canal={} recipient={}: {}", channel, recipient, e.getMessage());
        }
    }
}
