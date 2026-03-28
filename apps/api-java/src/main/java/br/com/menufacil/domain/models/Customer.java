package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "customers")
public class Customer extends BaseEntity {

    @Column(nullable = false)
    private String name;

    private String phone;
    private String email;

    @Column(name = "password_hash")
    private String passwordHash;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    private String gender;
    private String cpf;

    @Column(name = "loyalty_points", nullable = false)
    private int loyaltyPoints = 0;
}
