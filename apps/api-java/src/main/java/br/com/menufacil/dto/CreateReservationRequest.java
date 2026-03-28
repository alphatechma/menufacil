package br.com.menufacil.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateReservationRequest {

    @NotBlank(message = "Nome do cliente é obrigatório")
    private String customerName;

    @NotBlank(message = "Telefone do cliente é obrigatório")
    private String customerPhone;

    @NotNull(message = "Número de pessoas é obrigatório")
    @Min(value = 1, message = "Número de pessoas deve ser maior que 0")
    private Integer partySize;

    @NotBlank(message = "Data é obrigatória")
    private String date;

    @NotBlank(message = "Horário é obrigatório")
    private String timeStart;

    private String tableId;
    private String notes;
}
