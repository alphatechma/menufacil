package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "wallet_transactions")
public class WalletTransaction extends BaseEntity {

    @Column(name = "wallet_id", columnDefinition = "uuid", nullable = false)
    private UUID walletId;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    private String description;

    @Column(name = "order_id", columnDefinition = "uuid")
    private UUID orderId;
}
