package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class CouponResponse {
    private String id;
    private String code;
    private String discountType;
    private BigDecimal discountValue;
    private BigDecimal minOrderValue;
    private int maxUses;
    private int currentUses;
    private String validFrom;
    private String validTo;
    private boolean isActive;
    private String createdAt;
}
