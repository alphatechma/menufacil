package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateNotificationRequest {

    private String orderId;

    @NotNull(message = "Canal é obrigatório")
    @NotBlank(message = "Canal é obrigatório")
    private String channel;

    @NotBlank(message = "Destinatário é obrigatório")
    private String recipient;

    @NotBlank(message = "Conteúdo é obrigatório")
    private String content;
}
