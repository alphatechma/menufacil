package br.com.menufacil.domain.models;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "whatsapp_flow_executions")
public class WhatsappFlowExecution extends BaseEntity {

    @Column(name = "flow_id", columnDefinition = "uuid")
    private UUID flowId;

    @Column(nullable = false)
    private String phone;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "execution_state", columnDefinition = "jsonb")
    private String executionState;

    @Column(name = "current_node_id")
    private String currentNodeId;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "started_at", nullable = false)
    private LocalDateTime startedAt;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;
}
