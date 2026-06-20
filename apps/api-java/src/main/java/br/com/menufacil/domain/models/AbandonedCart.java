package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Carrinho abandonado de um cliente.
 * Mantém snapshot dos itens em JSON para recuperação posterior.
 */
@Getter
@Setter
@Entity
@Table(name = "abandoned_carts")
public class AbandonedCart extends BaseEntity {

    @Column(name = "customer_id", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb", nullable = false)
    private String items;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(nullable = false)
    private boolean recovered = false;

    @Column(name = "recovered_at")
    private LocalDateTime recoveredAt;

    @Column(name = "notification_sent", nullable = false)
    private boolean notificationSent = false;
}
