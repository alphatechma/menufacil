package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateDeliveryZoneRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    private BigDecimal fee;
    private String neighborhoods;
    private String polygon;
    private int minDeliveryTime;
    private int maxDeliveryTime;
}
