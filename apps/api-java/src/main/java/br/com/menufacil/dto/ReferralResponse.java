package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ReferralResponse {
    private String id;
    private String referrerId;
    private String referredId;
    private String code;
    private boolean rewardGiven;
    private int pointsAwarded;
    private LocalDateTime createdAt;
}
