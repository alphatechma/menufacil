package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "wallets", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"customer_id", "tenant_id"})
})
public class Wallet extends BaseEntity {

    @Column(name = "customer_id", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;
}
