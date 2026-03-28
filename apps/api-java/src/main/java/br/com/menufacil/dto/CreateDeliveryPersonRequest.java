package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateDeliveryPersonRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    private String phone;
    private Boolean isActive = true;
    private String commissionType;
    private BigDecimal commissionValue;
    private Boolean receivesDeliveryFee = false;
}
