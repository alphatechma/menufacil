package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@Entity
@Table(name = "delivery_persons")
public class DeliveryPerson extends BaseEntity {

    @Column(nullable = false)
    private String name;

    private String phone;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @Column(name = "commission_type")
    private String commissionType;

    @Column(name = "commission_value", precision = 10, scale = 2)
    private BigDecimal commissionValue;

    @Column(name = "receives_delivery_fee", nullable = false)
    private boolean receivesDeliveryFee = false;
}
