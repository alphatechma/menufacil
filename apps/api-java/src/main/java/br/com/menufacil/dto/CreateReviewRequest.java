package br.com.menufacil.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateReviewRequest {

    @NotBlank(message = "ID do pedido é obrigatório")
    private String orderId;

    @NotBlank(message = "ID do cliente é obrigatório")
    private String customerId;

    @NotNull(message = "Avaliação é obrigatória")
    @Min(value = 1, message = "Avaliação mínima é 1")
    @Max(value = 5, message = "Avaliação máxima é 5")
    private Integer rating;

    private String comment;
}
