package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateFloorPlanRequest {

    @NotBlank(message = "Nome do mapa é obrigatório")
    private String name;

    private UUID unitId;

    private String layout;
}
