package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ApplyReferralRequest {

    @NotBlank(message = "Código de indicação é obrigatório")
    private String code;
}
