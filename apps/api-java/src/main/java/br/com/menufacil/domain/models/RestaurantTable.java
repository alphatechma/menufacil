package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "restaurant_tables")
public class RestaurantTable extends BaseEntity {

    @Column(nullable = false)
    private int number;

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false)
    private String status = "available";

    @Column(name = "qr_code")
    private String qrCode;

    @Column(name = "sort_order")
    private int sortOrder;
}
