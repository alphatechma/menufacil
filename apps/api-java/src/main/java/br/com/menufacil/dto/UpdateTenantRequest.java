package br.com.menufacil.dto;

import lombok.Data;

@Data
public class UpdateTenantRequest {

    private String name;
    private String slug;
    private String phone;
    private String address;
    private String logoUrl;
    private String bannerUrl;
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;
    private String planId;
    private String businessHours;
    private String orderModes;
    private String paymentConfig;
    private Integer cancelTimeLimit;
}
