package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateTenantUnitRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    @NotBlank(message = "Slug é obrigatório")
    private String slug;

    private String address;

    private String phone;

    private String businessHours;

    private Boolean isActive = true;

    private String orderModes;
}
