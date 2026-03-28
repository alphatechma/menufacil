package br.com.menufacil.converter;

import br.com.menufacil.domain.models.Order;
import br.com.menufacil.domain.models.OrderItem;
import br.com.menufacil.dto.OrderResponse;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.List;

@Mapper(componentModel = "spring")
public interface OrderConverter {

    @Mapping(target = "id", expression = "java(order.getId().toString())")
    @Mapping(target = "status", expression = "java(order.getStatus().name())")
    @Mapping(target = "orderType", expression = "java(order.getOrderType().name())")
    @Mapping(target = "paymentMethod", expression = "java(order.getPaymentMethod() != null ? order.getPaymentMethod().name() : null)")
    @Mapping(target = "customerId", expression = "java(order.getCustomerId() != null ? order.getCustomerId().toString() : null)")
    @Mapping(target = "deliveryPersonId", expression = "java(order.getDeliveryPersonId() != null ? order.getDeliveryPersonId().toString() : null)")
    @Mapping(target = "tableId", expression = "java(order.getTableId() != null ? order.getTableId().toString() : null)")
    @Mapping(target = "createdAt", expression = "java(order.getCreatedAt() != null ? order.getCreatedAt().toString() : null)")
    @Mapping(target = "updatedAt", expression = "java(order.getUpdatedAt() != null ? order.getUpdatedAt().toString() : null)")
    @Mapping(target = "deliveredAt", expression = "java(order.getDeliveredAt() != null ? order.getDeliveredAt().toString() : null)")
    @Mapping(target = "items", source = "items")
    OrderResponse toResponse(Order order);

    @Mapping(target = "id", expression = "java(item.getId().toString())")
    @Mapping(target = "productId", expression = "java(item.getProductId() != null ? item.getProductId().toString() : null)")
    @Mapping(target = "variationId", expression = "java(item.getVariationId() != null ? item.getVariationId().toString() : null)")
    OrderResponse.OrderItemResponse toItemResponse(OrderItem item);

    List<OrderResponse.OrderItemResponse> toItemResponses(List<OrderItem> items);
}
