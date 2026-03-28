package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class TenantListResponse {

    private UUID id;
    private String name;
    private String slug;
    private String logoUrl;
    private String phone;
    private boolean isActive;
    private UUID planId;
    private long userCount;
    private LocalDateTime createdAt;
    private LocalDateTime deletedAt;
}
