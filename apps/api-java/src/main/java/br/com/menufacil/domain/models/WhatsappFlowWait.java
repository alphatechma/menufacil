package br.com.menufacil.domain.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Registro de "espera" criado por um node {@code delay} do Flow Engine.
 *
 * Cada wait representa uma execução pausada que deve ser retomada quando
 * {@link #resumeAt} for atingido. O worker {@code WhatsappFlowWaitWorker}
 * varre periodicamente registros {@code processed=false} cujo
 * {@code resumeAt <= now()} e dispara a continuação do fluxo a partir do
 * {@link #nextNodeId}.
 *
 * <p>Não há FK física para {@link WhatsappFlowExecution} (vínculo lógico via
 * {@link #executionId}) para evitar cascades indesejados durante o resume.</p>
 */
@Getter
@Setter
@Entity
@Table(
        name = "whatsapp_flow_waits",
        indexes = {
                @Index(name = "idx_flow_waits_pending", columnList = "processed, resume_at"),
                @Index(name = "idx_flow_waits_execution", columnList = "execution_id")
        }
)
public class WhatsappFlowWait extends BaseEntity {

    @Column(name = "execution_id", nullable = false, columnDefinition = "uuid")
    private UUID executionId;

    @Column(name = "node_id", nullable = false)
    private String nodeId;

    @Column(name = "next_node_id")
    private String nextNodeId;

    @Column(name = "resume_at", nullable = false)
    private LocalDateTime resumeAt;

    @Column(nullable = false)
    private boolean processed = false;

    @Column(name = "processed_at")
    private LocalDateTime processedAt;
}
