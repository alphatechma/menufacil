package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RedeemRewardRequest {

    @NotBlank(message = "ID da recompensa é obrigatório")
    private String rewardId;
}
