package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class SignRequest {

    @NotBlank(message = "A mensagem é obrigatória")
    private String message;
}
