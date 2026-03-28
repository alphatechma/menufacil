package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "reservations")
public class Reservation extends BaseEntity {

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "customer_phone", nullable = false)
    private String customerPhone;

    @Column(name = "party_size", nullable = false)
    private int partySize;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "time_start", nullable = false)
    private String timeStart;

    @Column(name = "table_id", columnDefinition = "uuid")
    private UUID tableId;

    @Column(nullable = false)
    private String status = "pending";

    private String notes;
}
