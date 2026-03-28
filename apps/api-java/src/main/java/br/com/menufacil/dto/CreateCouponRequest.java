package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateCouponRequest {

    @NotBlank(message = "Código do cupom é obrigatório")
    private String code;

    @NotBlank(message = "Tipo de desconto é obrigatório")
    private String discountType;

    @NotNull(message = "Valor do desconto é obrigatório")
    private BigDecimal discountValue;

    private BigDecimal minOrderValue;
    private int maxUses;
    private String validFrom;
    private String validTo;
    private Boolean isActive = true;
}
