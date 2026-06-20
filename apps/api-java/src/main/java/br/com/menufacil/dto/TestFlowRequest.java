package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TestFlowRequest {

    @NotBlank(message = "Telefone é obrigatório")
    private String phone;
}
