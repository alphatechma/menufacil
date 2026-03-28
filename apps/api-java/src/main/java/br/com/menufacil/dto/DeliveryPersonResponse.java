package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DeliveryPersonResponse {
    private String id;
    private String name;
    private String phone;
    private boolean isActive;
    private String commissionType;
    private BigDecimal commissionValue;
    private boolean receivesDeliveryFee;
    private String createdAt;
}
