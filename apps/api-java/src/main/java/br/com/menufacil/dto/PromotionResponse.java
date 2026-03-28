package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PromotionResponse {
    private String id;
    private String name;
    private String description;
    private String type;
    private String rules;
    private String schedule;
    private String discountType;
    private BigDecimal discountValue;
    private boolean isActive;
    private String validFrom;
    private String validTo;
    private String createdAt;
}
