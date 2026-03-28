package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "loyalty_rewards")
public class LoyaltyReward extends BaseEntity {

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "points_required", nullable = false)
    private int pointsRequired;

    @Column(name = "reward_type", nullable = false)
    private String rewardType;

    @Column(name = "reward_value", precision = 10, scale = 2)
    private BigDecimal rewardValue;

    @Column(name = "product_id", columnDefinition = "uuid")
    private UUID productId;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "cooldown_hours")
    private int cooldownHours;

    @Column(name = "expiration_hours")
    private int expirationHours;

    @Column(name = "max_redemptions_per_customer")
    private int maxRedemptionsPerCustomer;
}
