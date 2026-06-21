package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Requisição de login simples por telefone (sem senha).
 * Caso não exista cliente para o telefone informado, um novo é criado automaticamente.
 * Campo {@code name} é opcional e usado apenas na criação.
 */
@Data
public class CustomerLoginByPhoneRequest {

    @NotBlank(message = "Telefone é obrigatório")
    private String phone;

    private String name;
}
