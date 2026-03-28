package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class TenantPublicResponse {
    private String id;
    private String name;
    private String slug;
    private String logoUrl;
    private String bannerUrl;
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;
    private String phone;
    private String address;
    private String businessHours;
    private BigDecimal minOrderValue;
    private String orderModes;
    private String paymentConfig;
}
