package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "reviews")
public class Review extends BaseEntity {

    @Column(name = "order_id", columnDefinition = "uuid", nullable = false)
    private UUID orderId;

    @Column(name = "customer_id", columnDefinition = "uuid", nullable = false)
    private UUID customerId;

    @Column(nullable = false)
    private int rating;

    private String comment;

    private String reply;

    @Column(name = "replied_at")
    private LocalDateTime repliedAt;
}
