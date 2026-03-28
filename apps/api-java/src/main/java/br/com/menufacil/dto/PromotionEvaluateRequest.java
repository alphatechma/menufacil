package br.com.menufacil.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class PromotionEvaluateRequest {

    private List<CartItem> items;

    @Data
    public static class CartItem {
        private String productId;
        private String productName;
        private int quantity;
        private BigDecimal unitPrice;
    }
}
