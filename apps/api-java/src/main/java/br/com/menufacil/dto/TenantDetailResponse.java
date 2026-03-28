package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class TenantDetailResponse {

    private UUID id;
    private String name;
    private String slug;
    private String logoUrl;
    private String bannerUrl;
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;
    private String phone;
    private String address;
    private String businessHours;
    private BigDecimal minOrderValue;
    private boolean isActive;
    private UUID planId;
    private String orderModes;
    private String paymentConfig;
    private Integer cancelTimeLimit;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime deletedAt;
    private List<UserSummary> users;

    @Data
    @Builder
    public static class UserSummary {
        private UUID id;
        private String name;
        private String email;
        private String systemRole;
        private boolean isActive;
    }
}
