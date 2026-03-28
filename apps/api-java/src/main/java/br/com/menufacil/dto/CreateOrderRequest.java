package br.com.menufacil.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateOrderRequest {

    @NotNull(message = "Tipo do pedido é obrigatório")
    private String orderType;

    private String paymentMethod;

    @NotEmpty(message = "Itens do pedido são obrigatórios")
    private List<OrderItemRequest> items;

    private String customerId;
    private String customerName;
    private String notes;
    private String deliveryAddress;
    private BigDecimal deliveryFee;
    private BigDecimal changeFor;
    private String tableId;

    @Data
    public static class OrderItemRequest {
        @NotNull(message = "ID do produto é obrigatório")
        private String productId;
        private String productName;
        private int quantity = 1;
        private BigDecimal unitPrice;
        private String variationId;
        private String variationName;
        private String notes;
    }
}
