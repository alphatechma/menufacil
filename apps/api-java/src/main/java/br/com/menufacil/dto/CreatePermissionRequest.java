package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class CreatePermissionRequest {

    @NotBlank(message = "Chave da permissão é obrigatória")
    private String key;

    @NotBlank(message = "Nome da permissão é obrigatório")
    private String name;

    private UUID moduleId;
}
