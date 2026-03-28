package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCustomerRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    private String phone;
    private String email;
    private String password;
    private String birthDate;
    private String gender;
    private String cpf;
}
