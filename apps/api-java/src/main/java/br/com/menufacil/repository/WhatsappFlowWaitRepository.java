package br.com.menufacil.repository;

import br.com.menufacil.domain.models.WhatsappFlowWait;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WhatsappFlowWaitRepository extends JpaRepository<WhatsappFlowWait, UUID> {

    /**
     * Retorna os waits ainda não processados cujo horário de retomada já foi atingido,
     * ordenados pelo mais antigo (FIFO). Usado pelo worker @Scheduled.
     */
    List<WhatsappFlowWait> findByProcessedFalseAndResumeAtLessThanEqualOrderByResumeAtAsc(LocalDateTime now);

    /**
     * Retorna o wait pendente vinculado à execução (deve haver no máximo um por vez).
     */
    Optional<WhatsappFlowWait> findByExecutionIdAndProcessedFalse(UUID executionId);

    /**
     * Remove waits já processados cujo {@code processedAt} é anterior ao cutoff.
     * Usado pelo {@code CleanupWorker} para conter o crescimento indefinido da tabela.
     *
     * @return quantidade de registros removidos
     */
    @Modifying
    @Query("delete from WhatsappFlowWait w where w.processed = true and w.processedAt < :cutoff")
    int deleteByProcessedTrueAndProcessedAtBefore(@Param("cutoff") LocalDateTime cutoff);
}
