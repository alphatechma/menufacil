package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CreateRoleRequest {

    @NotBlank(message = "Nome do cargo é obrigatório")
    private String name;

    private String description;

    private List<String> permissionIds = new ArrayList<>();
}
