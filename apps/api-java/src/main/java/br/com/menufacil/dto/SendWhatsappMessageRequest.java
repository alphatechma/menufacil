package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.Map;

@Data
public class SendWhatsappMessageRequest {

    @NotBlank(message = "Nome da instância é obrigatório")
    private String instanceName;

    @NotBlank(message = "Telefone é obrigatório")
    private String phone;

    @NotBlank(message = "Conteúdo da mensagem é obrigatório")
    private String content;

    private String templateName;

    private Map<String, Object> variables;
}
