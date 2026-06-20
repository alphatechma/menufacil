package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "referrals")
public class Referral extends BaseEntity {

    @Column(name = "referrer_id", nullable = false, columnDefinition = "uuid")
    private UUID referrerId;

    @Column(name = "referred_id", columnDefinition = "uuid")
    private UUID referredId;

    @Column(name = "code", nullable = false, unique = true, length = 8)
    private String code;

    @Column(name = "reward_given", nullable = false)
    private boolean rewardGiven = false;

    @Column(name = "points_awarded", nullable = false)
    private int pointsAwarded = 0;
}
