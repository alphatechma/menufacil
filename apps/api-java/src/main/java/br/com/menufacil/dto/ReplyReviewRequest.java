package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ReplyReviewRequest {

    @NotBlank(message = "Resposta é obrigatória")
    private String reply;
}
