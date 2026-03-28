package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCategoryRequest {

    @NotBlank(message = "Nome é obrigatório")
    private String name;

    private String description;

    private String imageUrl;

    private Integer sortOrder = 0;

    private Boolean isActive = true;
}
