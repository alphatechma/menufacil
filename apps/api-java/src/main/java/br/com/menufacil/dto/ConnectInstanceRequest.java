package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ConnectInstanceRequest {

    @NotBlank(message = "Nome da instância é obrigatório")
    private String instanceName;

    private String unitId;
}
