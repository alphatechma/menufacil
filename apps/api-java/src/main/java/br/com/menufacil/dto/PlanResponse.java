package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class PlanResponse {
    private String id;
    private String name;
    private BigDecimal price;
    private Integer maxUsers;
    private Integer maxProducts;
    private boolean active;
    private List<SystemModuleResponse> modules;
}
