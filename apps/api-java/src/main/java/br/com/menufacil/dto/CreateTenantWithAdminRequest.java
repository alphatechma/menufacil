package br.com.menufacil.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CreateTenantWithAdminRequest {

    @NotBlank(message = "Nome do estabelecimento é obrigatório")
    private String name;

    @NotBlank(message = "Slug é obrigatório")
    private String slug;

    private String phone;
    private String address;
    private String planId;

    @NotBlank(message = "Nome do administrador é obrigatório")
    private String adminName;

    @NotBlank(message = "E-mail do administrador é obrigatório")
    @Email(message = "E-mail inválido")
    private String adminEmail;

    @NotBlank(message = "Senha do administrador é obrigatória")
    @Size(min = 6, message = "Senha deve ter no mínimo 6 caracteres")
    private String adminPassword;
}
