package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateProductRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    private String description;

    @NotNull(message = "Preço base é obrigatório")
    private BigDecimal basePrice;

    private String categoryId;

    private String imageUrl;

    private Boolean isActive = true;

    private Integer sortOrder = 0;

    private String dietaryTags;

    private String variationType;

    private Integer maxFlavors;
}
