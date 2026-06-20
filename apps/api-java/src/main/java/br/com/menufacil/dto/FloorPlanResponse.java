package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FloorPlanResponse {
    private String id;
    private String name;
    private String unitId;
    private String layout;
    private LocalDateTime createdAt;
}
