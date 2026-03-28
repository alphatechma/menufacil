package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class ProductResponse {
    private String id;
    private String name;
    private String description;
    private BigDecimal basePrice;
    private String imageUrl;
    private boolean isActive;
    private String categoryId;
    private String dietaryTags;
    private int sortOrder;
    private String variationType;
    private Integer maxFlavors;
}
