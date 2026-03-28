package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class StockMovementResponse {
    private String id;
    private String inventoryItemId;
    private String type;
    private BigDecimal quantity;
    private String notes;
    private String createdAt;
}
