package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class AbandonedCartStatsResponse {
    private long total;
    private long totalRecovered;
    private double recoveryRate;
    private BigDecimal lostRevenue;
}
