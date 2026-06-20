package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateWhatsappTemplateRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    @NotBlank(message = "Conteúdo do template é obrigatório")
    private String templateContent;

    private String variables;
}
