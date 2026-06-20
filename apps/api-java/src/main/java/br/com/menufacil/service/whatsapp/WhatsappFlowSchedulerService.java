package br.com.menufacil.service.whatsapp;

import br.com.menufacil.domain.enums.WhatsappFlowTriggerType;
import br.com.menufacil.domain.models.WhatsappFlow;
import br.com.menufacil.repository.WhatsappFlowRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Scheduler que dispara fluxos de WhatsApp do tipo {@code scheduled}.
 *
 * Roda a cada minuto, busca fluxos ativos com trigger scheduled, lê o
 * {@code triggerConfig} (JSON contendo {@code cron} e {@code lastRunAt}) e
 * decide se deve disparar baseado em uma janela mínima entre execuções.
 *
 * <p>Para cada fluxo elegível, itera sobre candidatos (clientes) e chama
 * {@link FlowEngineService#startExecution(UUID, UUID, String)}. A identificação
 * dos candidatos é um placeholder — TODO integrar com CustomerRepository.</p>
 *
 * <p>Implementação simplificada: usa o campo {@code lastRunAt} dentro do
 * triggerConfig e dispara se passou mais de {@link #MIN_INTERVAL_SECONDS} segundos.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WhatsappFlowSchedulerService {

    /** Intervalo mínimo entre disparos do mesmo fluxo (sem cron parser real). */
    private static final long MIN_INTERVAL_SECONDS = 3600L; // 1h padrão

    private final WhatsappFlowRepository whatsappFlowRepository;
    private final FlowEngineService flowEngineService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Executa a cada 60 segundos.
     *
     * <p>Busca todos os fluxos com triggerType=scheduled e active=true,
     * decide quais devem disparar e processa cada um.</p>
     */
    @Scheduled(fixedDelay = 60_000L)
    @Transactional
    public void processScheduledFlows() {
        List<WhatsappFlow> flows = whatsappFlowRepository
                .findAll()
                .stream()
                .filter(f -> f.getTriggerType() == WhatsappFlowTriggerType.scheduled)
                .filter(WhatsappFlow::isActive)
                .toList();

        if (flows.isEmpty()) {
            log.debug("Nenhum fluxo scheduled ativo");
            return;
        }

        log.debug("Processando {} fluxo(s) scheduled", flows.size());

        for (WhatsappFlow flow : flows) {
            try {
                processSingleFlow(flow);
            } catch (Exception e) {
                log.error("Erro processando fluxo scheduled {}: {}", flow.getId(), e.getMessage(), e);
            }
        }
    }

    private void processSingleFlow(WhatsappFlow flow) {
        Map<String, Object> config = parseConfig(flow.getTriggerConfig());

        if (!shouldTrigger(config)) {
            log.debug("Fluxo {} não está na janela de disparo", flow.getId());
            return;
        }

        log.info("Disparando fluxo scheduled '{}' (id={}) no tenant {}",
                flow.getName(), flow.getId(), flow.getTenantId());

        List<String> candidates = findCandidatePhones(flow);
        // TODO: integrar com CustomerRepository para identificar telefones-alvo
        // baseado em filtros do flow.triggerConfig (ex: segmento, tag, último pedido).
        for (String phone : candidates) {
            try {
                flowEngineService.startExecution(flow.getId(), flow.getTenantId(), phone);
            } catch (Exception e) {
                log.warn("Falha ao iniciar execução do fluxo {} para {}: {}",
                        flow.getId(), phone, e.getMessage());
            }
        }

        config.put("lastRunAt", LocalDateTime.now().toString());
        flow.setTriggerConfig(serializeConfig(config));
        whatsappFlowRepository.save(flow);
    }

    /**
     * Placeholder: lista de candidatos vazia.
     * <p>TODO: implementar lookup de clientes (CustomerRepository) com base
     * em filtros declarados no triggerConfig (segmento, tag, dias sem pedir, etc).</p>
     */
    private List<String> findCandidatePhones(WhatsappFlow flow) {
        return List.of();
    }

    private boolean shouldTrigger(Map<String, Object> config) {
        Object lastRun = config.get("lastRunAt");
        if (lastRun == null) {
            return true; // nunca rodou
        }
        try {
            LocalDateTime last = LocalDateTime.parse(String.valueOf(lastRun));
            return Duration.between(last, LocalDateTime.now()).getSeconds() >= MIN_INTERVAL_SECONDS;
        } catch (DateTimeParseException e) {
            log.warn("lastRunAt inválido em triggerConfig: {}", lastRun);
            return true;
        }
    }

    private Map<String, Object> parseConfig(String json) {
        if (json == null || json.isBlank()) {
            return new HashMap<>();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Falha ao parsear triggerConfig: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    private String serializeConfig(Map<String, Object> config) {
        try {
            return objectMapper.writeValueAsString(config);
        } catch (JsonProcessingException e) {
            log.warn("Falha ao serializar triggerConfig: {}", e.getMessage());
            return "{}";
        }
    }
}
