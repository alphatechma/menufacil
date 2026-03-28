package br.com.menufacil.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateRestaurantTableRequest {

    @NotNull(message = "Número da mesa é obrigatório")
    @Min(value = 1, message = "Número da mesa deve ser maior que 0")
    private Integer number;

    @NotNull(message = "Capacidade é obrigatória")
    @Min(value = 1, message = "Capacidade deve ser maior que 0")
    private Integer capacity;

    private String status;
    private String qrCode;
    private Integer sortOrder;
}
