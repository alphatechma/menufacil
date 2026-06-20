package br.com.menufacil.domain.models;

import br.com.menufacil.domain.enums.PaymentMethod;
import br.com.menufacil.domain.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "payment_transactions")
public class PaymentTransaction extends BaseEntity {

    @Column(name = "order_id", columnDefinition = "uuid")
    private UUID orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentMethod method;

    @Column(name = "external_id")
    private String externalId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status = PaymentStatus.pending;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "pix_qr_code", columnDefinition = "text")
    private String pixQrCode;

    @Column(name = "pix_copy_paste", columnDefinition = "text")
    private String pixCopyPaste;
}
