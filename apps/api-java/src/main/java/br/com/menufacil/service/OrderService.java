package br.com.menufacil.service;

import br.com.menufacil.config.observability.MetricsService;
import br.com.menufacil.converter.OrderConverter;
import br.com.menufacil.domain.enums.OrderStatus;
import br.com.menufacil.domain.enums.OrderType;
import br.com.menufacil.domain.enums.PaymentMethod;
import br.com.menufacil.domain.models.Customer;
import br.com.menufacil.domain.models.Order;
import br.com.menufacil.domain.models.OrderItem;
import br.com.menufacil.domain.models.Product;
import br.com.menufacil.dto.CreateNotificationRequest;
import br.com.menufacil.dto.CreateOrderRequest;
import br.com.menufacil.dto.OrderResponse;
import br.com.menufacil.dto.UpdateOrderStatusRequest;
import br.com.menufacil.repository.CustomerRepository;
import br.com.menufacil.repository.OrderRepository;
import br.com.menufacil.repository.ProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.opentelemetry.instrumentation.annotations.SpanAttribute;
import io.opentelemetry.instrumentation.annotations.WithSpan;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrderService {

    private final OrderRepository orderRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final OrderConverter orderConverter;
    private final WebSocketService webSocketService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final MetricsService metricsService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Transições de status válidas
     */
    private static final Map<OrderStatus, Set<OrderStatus>> VALID_TRANSITIONS = Map.of(
            OrderStatus.pending, Set.of(OrderStatus.confirmed, OrderStatus.cancelled),
            OrderStatus.confirmed, Set.of(OrderStatus.preparing, OrderStatus.cancelled),
            OrderStatus.preparing, Set.of(OrderStatus.ready, OrderStatus.cancelled),
            OrderStatus.ready, Set.of(OrderStatus.out_for_delivery, OrderStatus.picked_up, OrderStatus.served, OrderStatus.cancelled),
            OrderStatus.out_for_delivery, Set.of(OrderStatus.delivered, OrderStatus.cancelled),
            OrderStatus.delivered, Set.of(),
            OrderStatus.picked_up, Set.of(),
            OrderStatus.served, Set.of(),
            OrderStatus.cancelled, Set.of()
    );

    public List<OrderResponse> findByTenant(UUID tenantId) {
        return orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(orderConverter::toResponse)
                .toList();
    }

    public OrderResponse findById(UUID id, UUID tenantId) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Pedido não encontrado"));

        validateTenant(order, tenantId);
        return orderConverter.toResponse(order);
    }

    @Transactional
    @WithSpan("order.create")
    public OrderResponse create(@SpanAttribute("tenant.id") UUID tenantId, CreateOrderRequest request) {
        Order order = new Order();
        order.setTenantId(tenantId);
        order.setStatus(OrderStatus.pending);
        order.setOrderType(parseOrderType(request.getOrderType()));
        order.setNotes(request.getNotes());
        order.setCustomerName(request.getCustomerName());
        order.setDeliveryFee(request.getDeliveryFee() != null ? request.getDeliveryFee() : BigDecimal.ZERO);
        order.setChangeFor(request.getChangeFor());
        order.setAddressSnapshot(request.getDeliveryAddress());

        if (request.getPaymentMethod() != null) {
            order.setPaymentMethod(parsePaymentMethod(request.getPaymentMethod()));
        }
        order.setPaymentStatus("pending");

        if (request.getCustomerId() != null) {
            order.setCustomerId(UUID.fromString(request.getCustomerId()));
        }

        if (request.getTableId() != null) {
            order.setTableId(UUID.fromString(request.getTableId()));
        }

        // Gerar número do pedido (contar pedidos do tenant + 1)
        long count = orderRepository.countByTenantIdAndStatus(tenantId, null);
        // Simplificação: usar contagem total como base
        order.setOrderNumber((int) (orderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).size() + 1));

        // Processar itens
        BigDecimal subtotal = BigDecimal.ZERO;
        for (CreateOrderRequest.OrderItemRequest itemReq : request.getItems()) {
            OrderItem item = new OrderItem();
            item.setOrder(order);
            item.setQuantity(itemReq.getQuantity());
            item.setNotes(itemReq.getNotes());

            if (itemReq.getProductId() != null) {
                UUID productId = UUID.fromString(itemReq.getProductId());
                item.setProductId(productId);

                // Buscar nome e preço do produto se não informados
                Product product = productRepository.findById(productId).orElse(null);
                if (product != null) {
                    item.setProductName(itemReq.getProductName() != null ? itemReq.getProductName() : product.getName());
                    item.setUnitPrice(itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : product.getBasePrice());
                } else {
                    item.setProductName(itemReq.getProductName() != null ? itemReq.getProductName() : "Produto removido");
                    item.setUnitPrice(itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : BigDecimal.ZERO);
                }
            } else {
                item.setProductName(itemReq.getProductName() != null ? itemReq.getProductName() : "Item avulso");
                item.setUnitPrice(itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : BigDecimal.ZERO);
            }

            if (itemReq.getVariationId() != null) {
                item.setVariationId(UUID.fromString(itemReq.getVariationId()));
            }
            item.setVariationName(itemReq.getVariationName());

            subtotal = subtotal.add(item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
            order.getItems().add(item);
        }

        order.setSubtotal(subtotal);
        order.setDiscount(BigDecimal.ZERO);
        order.setTotal(subtotal.add(order.getDeliveryFee()).subtract(order.getDiscount()));

        order = orderRepository.save(order);
        metricsService.incrementOrderCreated(
                order.getOrderType() != null ? order.getOrderType().name() : null,
                order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null);
        log.info("Pedido #{} criado no tenant {}", order.getOrderNumber(), tenantId);

        // Notificar via WebSocket
        webSocketService.notifyNewOrder(tenantId, order.getId(), order.getOrderNumber());

        // Notificar customer via WhatsApp: pedido criado
        String phone = resolveCustomerPhone(order, tenantId);
        if (phone != null) {
            String msg = String.format(
                    "Olá! Seu pedido #%d foi confirmado com sucesso. Em breve você receberá atualizações sobre o preparo.",
                    order.getOrderNumber());
            agendarNotificacao(tenantId, "whatsapp", phone, msg, order.getId());
        }

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("total", order.getTotal() != null ? order.getTotal().toPlainString() : null);
            details.put("itemCount", order.getItems().size());
            details.put("customerId", order.getCustomerId() != null ? order.getCustomerId().toString() : null);
            details.put("orderNumber", order.getOrderNumber());
            details.put("orderType", order.getOrderType() != null ? order.getOrderType().name() : null);
            auditLogService.log(
                    order.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "order",
                    order.getId(),
                    order.getId().toString(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de criação de pedido: {}", e.getMessage());
        }

        return orderConverter.toResponse(order);
    }

    @Transactional
    public OrderResponse updateStatus(UUID id, UUID tenantId, UpdateOrderStatusRequest request) {
        Order order = orderRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Pedido não encontrado"));

        validateTenant(order, tenantId);

        OrderStatus newStatus;
        try {
            newStatus = OrderStatus.valueOf(request.getStatus());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Status inválido: " + request.getStatus());
        }

        // Validar transição de status
        Set<OrderStatus> allowedStatuses = VALID_TRANSITIONS.getOrDefault(order.getStatus(), Set.of());
        if (!allowedStatuses.contains(newStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    String.format("Transição de status inválida: %s -> %s", order.getStatus(), newStatus));
        }

        OrderStatus oldStatus = order.getStatus();
        order.setStatus(newStatus);

        // Marcar delivered_at quando entregue
        if (newStatus == OrderStatus.delivered || newStatus == OrderStatus.picked_up || newStatus == OrderStatus.served) {
            order.setDeliveredAt(LocalDateTime.now());
        }

        order = orderRepository.save(order);
        log.info("Pedido #{} status atualizado para {} no tenant {}", order.getOrderNumber(), newStatus, tenantId);

        // Notificar via WebSocket
        webSocketService.notifyOrderUpdate(tenantId, order.getId(), newStatus.name());

        // Notificar customer via WhatsApp sobre a mudança de status
        String phoneUpd = resolveCustomerPhone(order, tenantId);
        if (phoneUpd != null) {
            String msg = buildStatusChangeMessage(order.getOrderNumber(), newStatus, null);
            if (msg != null) {
                agendarNotificacao(tenantId, "whatsapp", phoneUpd, msg, order.getId());
            }
        }

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldStatus", oldStatus != null ? oldStatus.name() : null);
            details.put("newStatus", newStatus.name());
            details.put("orderNumber", order.getOrderNumber());
            String action = newStatus == OrderStatus.cancelled ? "cancel" : "update_status";
            auditLogService.log(
                    order.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    action,
                    "order",
                    order.getId(),
                    order.getId().toString(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de mudança de status do pedido: {}", e.getMessage());
        }

        return orderConverter.toResponse(order);
    }

    private void validateTenant(Order order, UUID tenantId) {
        if (!order.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }

    private OrderType parseOrderType(String type) {
        try {
            return OrderType.valueOf(type);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tipo de pedido inválido: " + type);
        }
    }

    private PaymentMethod parsePaymentMethod(String method) {
        try {
            return PaymentMethod.valueOf(method);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Método de pagamento inválido: " + method);
        }
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object details = auth.getDetails();
        if (details instanceof Claims claims) {
            String userId = claims.get("userId", String.class);
            if (userId != null && !userId.isBlank()) {
                try { return UUID.fromString(userId); } catch (IllegalArgumentException ignored) {}
            }
        }
        return null;
    }

    private String getCurrentIpAddress() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String forwarded = req.getHeader("X-Forwarded-For");
                if (forwarded != null && !forwarded.isBlank()) {
                    return forwarded.split(",")[0].trim();
                }
                return req.getRemoteAddr();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String serializeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception e) {
            return details.toString();
        }
    }

    /**
     * Resolve o telefone do customer (com DDI 55) para envio via WhatsApp.
     */
    private String resolveCustomerPhone(Order order, UUID tenantId) {
        if (order == null || order.getCustomerId() == null) return null;
        try {
            Customer customer = customerRepository.findById(order.getCustomerId()).orElse(null);
            if (customer == null) return null;
            return sanitizePhoneForWhatsApp(customer.getPhone());
        } catch (Exception e) {
            log.warn("Falha ao buscar customer para notificação: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Normaliza telefone: mantém apenas dígitos e adiciona DDI 55 se ausente.
     */
    private String sanitizePhoneForWhatsApp(String phone) {
        if (phone == null) return null;
        String digits = phone.replaceAll("\\D", "");
        if (digits.isBlank()) return null;
        if (!digits.startsWith("55")) {
            digits = "55" + digits;
        }
        return digits;
    }

    /**
     * Monta a mensagem de mudança de status. Retorna null para status que não notificam.
     */
    private String buildStatusChangeMessage(Integer orderNumber, OrderStatus status, String reason) {
        if (orderNumber == null || status == null) return null;
        return switch (status) {
            case preparing -> String.format("Seu pedido #%d está sendo preparado.", orderNumber);
            case ready -> String.format("Seu pedido #%d está pronto para retirada/saída.", orderNumber);
            case out_for_delivery -> String.format("Seu pedido #%d saiu para entrega!", orderNumber);
            case delivered, picked_up, served -> String.format("Seu pedido #%d foi entregue. Bom apetite!", orderNumber);
            case cancelled -> reason != null && !reason.isBlank()
                    ? String.format("Seu pedido #%d foi cancelado: %s", orderNumber, reason)
                    : String.format("Seu pedido #%d foi cancelado.", orderNumber);
            default -> null;
        };
    }

    /**
     * Agenda notificação sem propagar falha — operação principal não pode ser interrompida.
     */
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
