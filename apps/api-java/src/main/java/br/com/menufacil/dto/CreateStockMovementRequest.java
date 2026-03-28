package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateStockMovementRequest {

    @NotBlank(message = "ID do item de estoque é obrigatório")
    private String inventoryItemId;

    @NotBlank(message = "Tipo de movimentação é obrigatório")
    private String type;

    @NotNull(message = "Quantidade é obrigatória")
    private BigDecimal quantity;

    private String notes;
}
