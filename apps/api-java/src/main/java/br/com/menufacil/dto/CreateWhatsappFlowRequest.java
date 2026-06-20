package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateWhatsappFlowRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    private String description;

    @NotBlank(message = "Tipo de trigger é obrigatório")
    private String triggerType;

    private String triggerConfig;

    private String nodes;

    private String edges;

    private Boolean active = true;

    private Integer priority = 0;
}
