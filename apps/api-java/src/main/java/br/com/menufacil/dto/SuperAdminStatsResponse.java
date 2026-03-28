package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class SuperAdminStatsResponse {

    private long totalTenants;
    private long activeTenants;
    private long totalUsers;
    private BigDecimal mrr;
    private List<TenantsByPlan> tenantsByPlan;

    @Data
    @Builder
    public static class TenantsByPlan {
        private String planId;
        private String planName;
        private long count;
    }
}
