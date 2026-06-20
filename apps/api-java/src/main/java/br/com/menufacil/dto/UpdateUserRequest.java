package br.com.menufacil.dto;

import br.com.menufacil.domain.enums.UserRole;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.UUID;

@Data
public class UpdateUserRequest {

    @Size(min = 2, message = "Nome deve ter pelo menos 2 caracteres")
    private String name;

    private UserRole systemRole;

    private UUID roleId;

    private UUID unitId;

    private Boolean isActive;
}
