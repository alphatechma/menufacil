package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class SaveAbandonedCartRequest {

    @NotNull(message = "ID do cliente é obrigatório")
    private UUID customerId;

    @NotBlank(message = "Itens do carrinho são obrigatórios")
    private String items;

    @NotNull(message = "Total é obrigatório")
    private BigDecimal total;
}
