package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "promotions")
public class Promotion extends BaseEntity {

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(nullable = false)
    private String type;

    @Column(columnDefinition = "jsonb")
    private String rules;

    @Column(columnDefinition = "jsonb")
    private String schedule;

    @Column(name = "discount_type", nullable = false)
    private String discountType;

    @Column(name = "discount_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "valid_from")
    private LocalDateTime validFrom;

    @Column(name = "valid_to")
    private LocalDateTime validTo;
}
