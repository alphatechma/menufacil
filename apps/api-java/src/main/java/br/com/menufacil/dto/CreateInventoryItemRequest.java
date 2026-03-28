package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateInventoryItemRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    private String sku;
    private String unit;

    @NotNull(message = "Quantidade é obrigatória")
    private BigDecimal quantity;

    private BigDecimal minStock;
    private BigDecimal costPrice;
}
