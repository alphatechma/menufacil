package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "loyalty_redemptions")
public class LoyaltyRedemption extends BaseEntity {

    @Column(name = "customer_id", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Column(name = "reward_id", columnDefinition = "uuid", nullable = false)
    private UUID rewardId;

    @Column(name = "points_spent", nullable = false)
    private int pointsSpent;

    @Column(nullable = false)
    private String status = "pending";

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
}
