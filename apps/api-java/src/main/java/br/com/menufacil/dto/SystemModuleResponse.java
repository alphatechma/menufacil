package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class SystemModuleResponse {
    private String id;
    private String key;
    private String name;
    private String description;
}
