package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ValidateCouponRequest {

    @NotBlank(message = "Código do cupom é obrigatório")
    private String code;

    @NotNull(message = "Total do pedido é obrigatório")
    private BigDecimal orderTotal;
}
