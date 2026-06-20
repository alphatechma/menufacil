package br.com.menufacil.dto;

import br.com.menufacil.domain.enums.UserRole;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private String id;
    private String name;
    private String email;
    private UserRole systemRole;
    private String roleId;
    private String roleName;
    private String unitId;
    private String unitName;
    private boolean active;
    private LocalDateTime createdAt;
}
