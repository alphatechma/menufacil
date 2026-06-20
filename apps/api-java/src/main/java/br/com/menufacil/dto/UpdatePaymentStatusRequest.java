package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdatePaymentStatusRequest {

    @NotBlank(message = "Status é obrigatório")
    private String status;

    private String externalId;
}
