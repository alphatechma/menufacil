package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class OrderResponse {
    private String id;
    private Integer orderNumber;
    private String status;
    private String orderType;
    private String paymentMethod;
    private String paymentStatus;
    private BigDecimal subtotal;
    private BigDecimal deliveryFee;
    private BigDecimal discount;
    private BigDecimal total;
    private BigDecimal changeFor;
    private String notes;
    private String customerId;
    private String customerName;
    private String deliveryPersonId;
    private String tableId;
    private String addressSnapshot;
    private String createdAt;
    private String updatedAt;
    private String deliveredAt;
    private List<OrderItemResponse> items;

    @Data
    @Builder
    public static class OrderItemResponse {
        private String id;
        private String productId;
        private String productName;
        private int quantity;
        private BigDecimal unitPrice;
        private String variationId;
        private String variationName;
        private String notes;
    }
}
