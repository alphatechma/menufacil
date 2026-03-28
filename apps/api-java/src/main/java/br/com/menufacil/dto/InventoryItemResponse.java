package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class InventoryItemResponse {
    private String id;
    private String name;
    private String sku;
    private String unit;
    private BigDecimal quantity;
    private BigDecimal minStock;
    private BigDecimal costPrice;
    private String createdAt;
}
