package br.com.menufacil.service.whatsapp;

import br.com.menufacil.domain.models.WhatsappFlowExecution;
import br.com.menufacil.domain.models.WhatsappFlowWait;
import br.com.menufacil.repository.WhatsappFlowExecutionRepository;
import br.com.menufacil.repository.WhatsappFlowWaitRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Worker responsável por retomar execuções pausadas por nodes {@code delay}.
 *
 * <p>Roda a cada 10 segundos (granularidade compatível com delays curtos) e
 * varre {@code whatsapp_flow_waits} buscando registros pendentes cujo
 * {@code resumeAt} já passou. Para cada wait:</p>
 *
 * <ol>
 *   <li>Marca {@code processed=true} ANTES de invocar o engine — garante
 *       idempotência: se a chamada ao engine falhar, o wait não é reprocessado
 *       indefinidamente (operador investiga via logs).</li>
 *   <li>Verifica se a execução ainda existe e está ativa.</li>
 *   <li>Chama {@link FlowEngineService#resumeFromNode(java.util.UUID, String)}
 *       passando o {@code nextNodeId} pré-resolvido pelo engine.</li>
 * </ol>
 *
 * <p>Limita a 100 waits por ciclo para não monopolizar o scheduler.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsappFlowWaitWorker {

    /** Teto de waits processados por ciclo (evita starvation do scheduler). */
    private static final int MAX_WAITS_PER_CYCLE = 100;

    private final WhatsappFlowWaitRepository whatsappFlowWaitRepository;
    private final WhatsappFlowExecutionRepository whatsappFlowExecutionRepository;
    private final FlowEngineService flowEngineService;

    /**
     * Processa waits pendentes a cada 10 segundos.
     */
    @Scheduled(fixedDelay = 10_000L)
    @Transactional
    public void processPendingWaits() {
        LocalDateTime now = LocalDateTime.now();
        List<WhatsappFlowWait> pending = whatsappFlowWaitRepository
                .findByProcessedFalseAndResumeAtLessThanEqualOrderByResumeAtAsc(now);

        if (pending.isEmpty()) {
            return;
        }

        int total = Math.min(pending.size(), MAX_WAITS_PER_CYCLE);
        log.debug("WhatsappFlowWaitWorker: processando {} wait(s) pendentes", total);

        for (int i = 0; i < total; i++) {
            WhatsappFlowWait wait = pending.get(i);
            processOne(wait);
        }
    }

    private void processOne(WhatsappFlowWait wait) {
        // 1) Idempotência: marca como processado ANTES de chamar o engine.
        wait.setProcessed(true);
        wait.setProcessedAt(LocalDateTime.now());
        whatsappFlowWaitRepository.save(wait);

        // 2) Verifica execução ativa.
        Optional<WhatsappFlowExecution> opt = whatsappFlowExecutionRepository.findById(wait.getExecutionId());
        if (opt.isEmpty()) {
            log.warn("WhatsappFlowWaitWorker: execução {} do wait {} não existe — pulando",
                    wait.getExecutionId(), wait.getId());
            return;
        }
        WhatsappFlowExecution execution = opt.get();
        if (!execution.isActive()) {
            log.info("WhatsappFlowWaitWorker: execução {} já encerrada — wait {} ignorado",
                    execution.getId(), wait.getId());
            return;
        }

        // 3) Retoma o fluxo a partir do nextNodeId pré-resolvido.
        try {
            flowEngineService.resumeFromNode(wait.getExecutionId(), wait.getNextNodeId());
            log.info("WhatsappFlowWaitWorker: execução {} retomada via wait {} (próximo node={})",
                    wait.getExecutionId(), wait.getId(), wait.getNextNodeId());
        } catch (RuntimeException e) {
            log.error("WhatsappFlowWaitWorker: falha ao retomar execução {} via wait {}: {}",
                    wait.getExecutionId(), wait.getId(), e.getMessage(), e);
        }
    }
}
