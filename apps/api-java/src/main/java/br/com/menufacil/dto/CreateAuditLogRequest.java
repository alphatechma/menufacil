package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.UUID;

@Data
public class CreateAuditLogRequest {

    private UUID userId;

    @NotBlank(message = "Email do usuário é obrigatório")
    private String userEmail;

    @NotBlank(message = "Ação é obrigatória")
    private String action;

    @NotBlank(message = "Tipo da entidade é obrigatório")
    private String entityType;

    private UUID entityId;

    private String entityName;

    private String details;

    private String ipAddress;
}
