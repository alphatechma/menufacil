package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateLoyaltyRewardRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    private String description;

    @NotNull(message = "Pontos necessários é obrigatório")
    private Integer pointsRequired;

    @NotBlank(message = "Tipo de recompensa é obrigatório")
    private String rewardType;

    private BigDecimal rewardValue;
    private String productId;
    private Boolean isActive = true;
    private int cooldownHours;
    private int expirationHours;
    private int maxRedemptionsPerCustomer;
}
