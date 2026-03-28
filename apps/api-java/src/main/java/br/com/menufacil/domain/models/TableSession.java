package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "table_sessions")
public class TableSession extends BaseEntity {

    @Column(name = "table_id", columnDefinition = "uuid", nullable = false)
    private UUID tableId;

    @Column(nullable = false)
    private String status = "open";

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;
}
