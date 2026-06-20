package br.com.menufacil.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreatePlanRequest {

    @NotBlank(message = "Nome do plano é obrigatório")
    private String name;

    @NotNull(message = "Preço é obrigatório")
    @DecimalMin(value = "0.0", inclusive = true, message = "Preço deve ser maior ou igual a 0")
    private BigDecimal price;

    private Integer maxUsers;

    private Integer maxProducts;

    private Boolean isActive = true;
}
