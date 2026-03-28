package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class AnalyticsOverviewResponse {
    private BigDecimal revenue;
    private BigDecimal previousRevenue;
    private long orders;
    private long previousOrders;
    private BigDecimal avgTicket;
    private BigDecimal previousAvgTicket;
    private double cancelRate;
    private double previousCancelRate;
}
