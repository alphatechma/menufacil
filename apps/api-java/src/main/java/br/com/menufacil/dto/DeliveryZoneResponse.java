package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class DeliveryZoneResponse {
    private String id;
    private String name;
    private BigDecimal fee;
    private String neighborhoods;
    private String polygon;
    private int minDeliveryTime;
    private int maxDeliveryTime;
    private String createdAt;
}
