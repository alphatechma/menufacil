package br.com.menufacil.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class AssignModulesRequest {

    @NotNull(message = "Lista de módulos é obrigatória")
    private List<String> moduleIds;
}
