package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class LoyaltyRewardResponse {
    private String id;
    private String name;
    private String description;
    private int pointsRequired;
    private String rewardType;
    private BigDecimal rewardValue;
    private String productId;
    private boolean isActive;
    private int cooldownHours;
    private int expirationHours;
    private int maxRedemptionsPerCustomer;
    private String createdAt;
}
