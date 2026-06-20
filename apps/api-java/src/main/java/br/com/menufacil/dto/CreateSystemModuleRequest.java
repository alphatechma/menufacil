package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateSystemModuleRequest {

    @NotBlank(message = "Chave do módulo é obrigatória")
    private String key;

    @NotBlank(message = "Nome do módulo é obrigatório")
    private String name;

    private String description;
}
