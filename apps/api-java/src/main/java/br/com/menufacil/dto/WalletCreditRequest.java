package br.com.menufacil.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class WalletCreditRequest {

    @NotBlank(message = "ID do cliente é obrigatório")
    private String customerId;

    @NotNull(message = "Valor é obrigatório")
    @DecimalMin(value = "0.01", message = "Valor deve ser maior que zero")
    private BigDecimal amount;

    @NotBlank(message = "Descrição é obrigatória")
    private String description;
}
