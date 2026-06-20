package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class PermissionResponse {
    private String id;
    private String key;
    private String name;
    private String moduleId;
    private String moduleKey;
    private String moduleName;
}
