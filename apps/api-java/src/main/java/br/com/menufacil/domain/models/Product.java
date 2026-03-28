package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "products")
public class Product extends BaseEntity {

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "base_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal basePrice;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "sort_order")
    private int sortOrder;

    @Column(name = "category_id", columnDefinition = "uuid")
    private UUID categoryId;

    @Column(name = "dietary_tags", columnDefinition = "jsonb")
    private String dietaryTags;

    @Column(name = "variation_type")
    private String variationType;

    @Column(name = "max_flavors")
    private Integer maxFlavors;
}
