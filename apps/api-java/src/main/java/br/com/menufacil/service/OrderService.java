package br.com.menufacil.service;

import br.com.menufacil.converter.OrderConverter;
import br.com.menufacil.domain.enums.OrderStatus;
import br.com.menufacil.domain.enums.OrderType;
import br.com.menufacil.domain.enums.PaymentMethod;
import br.com.menufacil.domain.models.Order;
import br.com.menufacil.domain.models.OrderItem;
import br.com.menufacil.domain.models.Product;
import br.com.menufacil.dto.CreateOrderRequest;
import br.com.menufacil.dto.OrderResponse;
import br.com.menufacil.dto.UpdateOrderStatusRequest;
import br.com.menufacil.repository.OrderRepository;
import br.com.menufacil.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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
    private final OrderConverter orderConverter;
    private final WebSocketService webSocketService;

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
    public OrderResponse create(UUID tenantId, CreateOrderRequest request) {
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
        log.info("Pedido #{} criado no tenant {}", order.getOrderNumber(), tenantId);

        // Notificar via WebSocket
        webSocketService.notifyNewOrder(tenantId, order.getId(), order.getOrderNumber());

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

        order.setStatus(newStatus);

        // Marcar delivered_at quando entregue
        if (newStatus == OrderStatus.delivered || newStatus == OrderStatus.picked_up || newStatus == OrderStatus.served) {
            order.setDeliveredAt(LocalDateTime.now());
        }

        order = orderRepository.save(order);
        log.info("Pedido #{} status atualizado para {} no tenant {}", order.getOrderNumber(), newStatus, tenantId);

        // Notificar via WebSocket
        webSocketService.notifyOrderUpdate(tenantId, order.getId(), newStatus.name());

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
}
