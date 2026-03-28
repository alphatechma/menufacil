package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LoyaltyRedemptionResponse {
    private String id;
    private String customerId;
    private String rewardId;
    private int pointsSpent;
    private String status;
    private String expiresAt;
    private String createdAt;
}
