package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TenantUnitResponse {
    private String id;
    private String name;
    private String slug;
    private String address;
    private String phone;
    private String businessHours;
    private boolean active;
    private boolean headquarters;
    private String orderModes;
}
