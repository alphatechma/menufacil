package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class AbandonedCartResponse {
    private String id;
    private String customerId;
    private String items;
    private BigDecimal total;
    private boolean recovered;
    private LocalDateTime recoveredAt;
    private boolean notificationSent;
    private LocalDateTime createdAt;
}
