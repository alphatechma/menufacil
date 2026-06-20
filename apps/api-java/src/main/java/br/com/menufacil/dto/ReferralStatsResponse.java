package br.com.menufacil.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReferralStatsResponse {
    private long totalReferrals;
    private long successfulReferrals;
    private double conversionRate;
    private long totalPointsAwarded;
    private List<TopReferrer> topReferrers;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TopReferrer {
        private String referrerId;
        private long count;
        private long totalPoints;
    }
}
