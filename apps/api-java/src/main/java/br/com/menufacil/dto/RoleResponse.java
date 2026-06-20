package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class RoleResponse {
    private String id;
    private String name;
    private String description;
    private boolean isSystemDefault;
    private List<PermissionResponse> permissions;
}
