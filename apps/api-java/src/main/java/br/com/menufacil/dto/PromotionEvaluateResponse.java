package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class PromotionEvaluateResponse {

    private BigDecimal totalDiscount;
    private List<AppliedPromotion> appliedPromotions;

    @Data
    @Builder
    public static class AppliedPromotion {
        private String promotionId;
        private String promotionName;
        private String discountType;
        private BigDecimal discountValue;
        private BigDecimal discountAmount;
    }
}
