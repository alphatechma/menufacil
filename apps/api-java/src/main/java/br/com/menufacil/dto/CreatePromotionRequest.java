package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreatePromotionRequest {

    @NotBlank(message = "Nome da promoção é obrigatório")
    private String name;

    private String description;

    @NotBlank(message = "Tipo da promoção é obrigatório")
    private String type;

    private String rules;
    private String schedule;

    @NotBlank(message = "Tipo de desconto é obrigatório")
    private String discountType;

    @NotNull(message = "Valor do desconto é obrigatório")
    private BigDecimal discountValue;

    private Boolean isActive = true;
    private String validFrom;
    private String validTo;
}
