package br.com.menufacil.domain.models;

import br.com.menufacil.domain.enums.NotificationChannel;
import br.com.menufacil.domain.enums.NotificationStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "notifications")
public class Notification extends BaseEntity {

    @Column(name = "order_id", columnDefinition = "uuid")
    private UUID orderId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationChannel channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private NotificationStatus status = NotificationStatus.pending;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(nullable = false)
    private String recipient;

    @Column(nullable = false, columnDefinition = "text")
    private String content;
}
