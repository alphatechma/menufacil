package br.com.menufacil.service.whatsapp;

import br.com.menufacil.domain.enums.WhatsappFlowTriggerType;
import br.com.menufacil.domain.models.WhatsappFlow;
import br.com.menufacil.domain.models.WhatsappFlowExecution;
import br.com.menufacil.domain.models.WhatsappFlowWait;
import br.com.menufacil.repository.WhatsappFlowExecutionRepository;
import br.com.menufacil.repository.WhatsappFlowRepository;
import br.com.menufacil.repository.WhatsappFlowWaitRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Motor de execução (interpreter) dos fluxos de WhatsApp.
 *
 * Lê o JSON de nodes/edges do {@link WhatsappFlow} e mantém o estado
 * em {@link WhatsappFlowExecution}, avançando node a node em resposta
 * a mensagens recebidas pelo cliente.
 *
 * Cada node possui {id, type, config}. Tipos suportados:
 *  - message  : envia conteúdo e segue para o próximo node default
 *  - question : envia a pergunta e PARA (aguarda próxima mensagem do usuário)
 *  - condition: avalia config.expression contra executionState e escolhe
 *               a edge baseada em true/false
 *  - action   : dispara HTTP request configurável (POST/GET/PUT/DELETE) com
 *               placeholders {{key}} resolvidos do executionState
 *  - delay    : cria registro em whatsapp_flow_waits e PARA a execução; o
 *               WhatsappFlowWaitWorker retoma o fluxo quando resumeAt chega
 *
 * Cada edge possui {source, target, condition?}.
 *
 * O executionState é um {@code Map<String,Object>} serializado em JSON
 * que armazena as respostas do usuário usando o id do node como chave.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FlowEngineService {

    private static final int MAX_NODES_PER_STEP = 50;
    private static final String DEFAULT_EDGE_CONDITION_TRUE = "true";
    private static final String DEFAULT_EDGE_CONDITION_FALSE = "false";

    private final WhatsappFlowRepository whatsappFlowRepository;
    private final WhatsappFlowExecutionRepository whatsappFlowExecutionRepository;
    private final WhatsappFlowWaitRepository whatsappFlowWaitRepository;
    private final WhatsappMessageService whatsappMessageService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestClient actionRestClient = RestClient.builder().build();

    /**
     * Processa uma mensagem recebida do usuário.
     *
     * <p>Se existir execução ativa para o telefone+tenant, avança o node atual
     * consumindo o {@code content} como resposta. Caso contrário, busca um fluxo
     * com trigger {@code keyword} cujo conteúdo combine e inicia nova execução.</p>
     */
    /**
     * Versão assíncrona usada pelo webhook — não bloqueia o thread HTTP que
     * recebe o evento da Evolution API. Engole exceções para garantir
     * isolamento (webhook nunca pode pagar pelo erro do engine).
     */
    @Async
    public void processIncomingMessageAsync(UUID tenantId, String phone, String content) {
        try {
            processIncomingMessage(tenantId, phone, content);
        } catch (Exception e) {
            log.error("Erro processando fluxo async para tenant={} phone={}: {}",
                    tenantId, phone, e.getMessage(), e);
        }
    }

    @Transactional
    public Optional<WhatsappFlowExecution> processIncomingMessage(UUID tenantId, String phone, String content) {
        if (tenantId == null || phone == null || content == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "tenantId, phone e content são obrigatórios");
        }

        Optional<WhatsappFlowExecution> active = whatsappFlowExecutionRepository
                .findFirstByTenantIdAndPhoneAndActiveTrueOrderByStartedAtDesc(tenantId, phone);

        if (active.isPresent()) {
            log.info("Avançando execução {} com input do usuário", active.get().getId());
            advanceExecution(active.get().getId(), content);
            return active;
        }

        Optional<WhatsappFlow> matched = findFlowByKeyword(tenantId, content);
        if (matched.isEmpty()) {
            log.debug("Nenhum fluxo com trigger keyword combinou com '{}' no tenant {}", content, tenantId);
            return Optional.empty();
        }

        WhatsappFlowExecution started = startExecution(matched.get().getId(), tenantId, phone);
        return Optional.of(started);
    }

    /**
     * Cria uma nova execução para o fluxo informado e executa o primeiro node.
     */
    @Transactional
    public WhatsappFlowExecution startExecution(UUID flowId, UUID tenantId, String phone) {
        WhatsappFlow flow = whatsappFlowRepository.findById(flowId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fluxo não encontrado"));

        validateTenant(flow.getTenantId(), tenantId);
        if (!flow.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Fluxo inativo");
        }

        WhatsappFlowExecution execution = new WhatsappFlowExecution();
        execution.setTenantId(tenantId);
        execution.setFlowId(flow.getId());
        execution.setPhone(phone);
        execution.setActive(true);
        execution.setStartedAt(LocalDateTime.now());
        execution.setExecutionState(serializeState(new HashMap<>()));

        List<Map<String, Object>> nodes = parseList(flow.getNodes());
        List<Map<String, Object>> edges = parseList(flow.getEdges());

        if (nodes.isEmpty()) {
            execution.setActive(false);
            execution.setEndedAt(LocalDateTime.now());
            log.warn("Fluxo {} não possui nodes, encerrando execução imediatamente", flow.getId());
            return whatsappFlowExecutionRepository.save(execution);
        }

        Map<String, Object> firstNode = nodes.get(0);
        execution.setCurrentNodeId(String.valueOf(firstNode.get("id")));
        execution = whatsappFlowExecutionRepository.save(execution);

        log.info("Execução {} iniciada para fluxo {} no telefone {}",
                execution.getId(), flow.getId(), phone);

        return runFromCurrentNode(execution, nodes, edges, null);
    }

    /**
     * Avança a execução existente com a resposta do usuário.
     */
    @Transactional
    public WhatsappFlowExecution advanceExecution(UUID executionId, String userInput) {
        WhatsappFlowExecution execution = whatsappFlowExecutionRepository.findById(executionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Execução não encontrada"));

        if (!execution.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Execução já encerrada");
        }

        WhatsappFlow flow = whatsappFlowRepository.findById(execution.getFlowId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fluxo da execução não encontrado"));

        List<Map<String, Object>> nodes = parseList(flow.getNodes());
        List<Map<String, Object>> edges = parseList(flow.getEdges());

        Map<String, Object> state = parseState(execution.getExecutionState());
        String currentNodeId = execution.getCurrentNodeId();
        if (currentNodeId != null && userInput != null) {
            state.put(currentNodeId, userInput);
        }
        execution.setExecutionState(serializeState(state));

        String nextNodeId = resolveNextNodeId(edges, currentNodeId, null);
        if (nextNodeId == null) {
            return finishExecution(execution, "fim do fluxo após resposta do usuário");
        }
        execution.setCurrentNodeId(nextNodeId);

        return runFromCurrentNode(execution, nodes, edges, userInput);
    }

    /**
     * Retoma a execução pausada por um node {@code delay}, posicionando o
     * cursor em {@code fromNodeId} e re-entrando no loop do interpreter.
     *
     * <p>Usado exclusivamente pelo {@code WhatsappFlowWaitWorker} após o
     * resumeAt do wait ser atingido.</p>
     */
    @Transactional
    public WhatsappFlowExecution resumeFromNode(UUID executionId, String fromNodeId) {
        WhatsappFlowExecution execution = whatsappFlowExecutionRepository.findById(executionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Execução não encontrada"));

        if (!execution.isActive()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Execução já encerrada");
        }

        if (fromNodeId == null) {
            return finishExecution(execution, "fim do fluxo após delay (sem próximo node)");
        }

        WhatsappFlow flow = whatsappFlowRepository.findById(execution.getFlowId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fluxo da execução não encontrado"));

        List<Map<String, Object>> nodes = parseList(flow.getNodes());
        List<Map<String, Object>> edges = parseList(flow.getEdges());

        execution.setCurrentNodeId(fromNodeId);
        return runFromCurrentNode(execution, nodes, edges, null);
    }

    /**
     * Encerra a execução manualmente.
     */
    @Transactional
    public WhatsappFlowExecution endExecution(UUID executionId, String reason) {
        WhatsappFlowExecution execution = whatsappFlowExecutionRepository.findById(executionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Execução não encontrada"));
        return finishExecution(execution, reason);
    }

    // --- Interpreter ---------------------------------------------------------

    private WhatsappFlowExecution runFromCurrentNode(WhatsappFlowExecution execution,
                                                     List<Map<String, Object>> nodes,
                                                     List<Map<String, Object>> edges,
                                                     String lastInput) {
        int safety = 0;
        while (execution.isActive() && execution.getCurrentNodeId() != null) {
            if (++safety > MAX_NODES_PER_STEP) {
                log.warn("Execução {} atingiu MAX_NODES_PER_STEP={}, encerrando por segurança",
                        execution.getId(), MAX_NODES_PER_STEP);
                return finishExecution(execution, "limite de nodes por step atingido");
            }

            Map<String, Object> node = findNode(nodes, execution.getCurrentNodeId());
            if (node == null) {
                return finishExecution(execution, "node atual não encontrado no fluxo");
            }

            String type = String.valueOf(node.getOrDefault("type", "")).toLowerCase();
            Map<String, Object> config = asMap(node.get("config"));
            Map<String, Object> state = parseState(execution.getExecutionState());

            switch (type) {
                case "message": {
                    String content = String.valueOf(config.getOrDefault("content", ""));
                    whatsappMessageService.sendOutbound(execution.getTenantId(), execution.getPhone(), content);
                    String nextId = resolveNextNodeId(edges, execution.getCurrentNodeId(), null);
                    if (nextId == null) {
                        return finishExecution(execution, "fim do fluxo após mensagem");
                    }
                    execution.setCurrentNodeId(nextId);
                    break;
                }
                case "question": {
                    String content = String.valueOf(config.getOrDefault("content", ""));
                    whatsappMessageService.sendOutbound(execution.getTenantId(), execution.getPhone(), content);
                    // PARA: aguarda próxima mensagem do usuário; mantém node atual.
                    return whatsappFlowExecutionRepository.save(execution);
                }
                case "condition": {
                    boolean result = evaluateExpression(config, state, lastInput);
                    String handle = result ? DEFAULT_EDGE_CONDITION_TRUE : DEFAULT_EDGE_CONDITION_FALSE;
                    String nextId = resolveNextNodeId(edges, execution.getCurrentNodeId(), handle);
                    if (nextId == null) {
                        nextId = resolveNextNodeId(edges, execution.getCurrentNodeId(), null);
                    }
                    if (nextId == null) {
                        return finishExecution(execution, "fim do fluxo após condição");
                    }
                    execution.setCurrentNodeId(nextId);
                    break;
                }
                case "action": {
                    executeActionNode(node, execution, state);
                    String nextId = resolveNextNodeId(edges, execution.getCurrentNodeId(), null);
                    if (nextId == null) {
                        return finishExecution(execution, "fim do fluxo após action");
                    }
                    execution.setCurrentNodeId(nextId);
                    break;
                }
                case "delay": {
                    long delaySeconds = parseDelaySeconds(config);
                    String currentNodeId = execution.getCurrentNodeId();
                    String nextId = resolveNextNodeId(edges, currentNodeId, null);

                    WhatsappFlowWait wait = new WhatsappFlowWait();
                    wait.setTenantId(execution.getTenantId());
                    wait.setExecutionId(execution.getId());
                    wait.setNodeId(currentNodeId);
                    wait.setNextNodeId(nextId);
                    wait.setResumeAt(LocalDateTime.now().plusSeconds(delaySeconds));
                    wait.setProcessed(false);
                    whatsappFlowWaitRepository.save(wait);

                    log.info("Node delay {} criou wait de {}s para execução {} (próximo node={})",
                            currentNodeId, delaySeconds, execution.getId(), nextId);

                    // PARA: persiste estado atual e sai do loop; o worker retoma quando resumeAt chegar.
                    return whatsappFlowExecutionRepository.save(execution);
                }
                default:
                    log.warn("Tipo de node desconhecido '{}' na execução {}", type, execution.getId());
                    String nextId = resolveNextNodeId(edges, execution.getCurrentNodeId(), null);
                    if (nextId == null) {
                        return finishExecution(execution, "fim do fluxo após node desconhecido");
                    }
                    execution.setCurrentNodeId(nextId);
            }

            lastInput = null;
        }

        return whatsappFlowExecutionRepository.save(execution);
    }

    private WhatsappFlowExecution finishExecution(WhatsappFlowExecution execution, String reason) {
        execution.setActive(false);
        execution.setEndedAt(LocalDateTime.now());
        log.info("Execução {} encerrada: {}", execution.getId(), reason);
        return whatsappFlowExecutionRepository.save(execution);
    }

    private Optional<WhatsappFlow> findFlowByKeyword(UUID tenantId, String content) {
        List<WhatsappFlow> flows = whatsappFlowRepository
                .findByTenantIdAndTriggerTypeAndActiveTrueOrderByPriorityDesc(
                        tenantId, WhatsappFlowTriggerType.keyword);

        String normalized = content.trim().toLowerCase();
        for (WhatsappFlow flow : flows) {
            Map<String, Object> trigger = asMap(parseJson(flow.getTriggerConfig()));
            List<String> keywords = parseKeywords(trigger.get("keywords"));
            for (String keyword : keywords) {
                if (keyword == null || keyword.isBlank()) continue;
                if (normalized.contains(keyword.trim().toLowerCase())) {
                    return Optional.of(flow);
                }
            }
        }
        return Optional.empty();
    }

    private boolean evaluateExpression(Map<String, Object> config,
                                       Map<String, Object> state,
                                       String lastInput) {
        String expression = String.valueOf(config.getOrDefault("expression", "")).trim();
        if (expression.isEmpty()) {
            return false;
        }
        // Caso simples: "campo == valor" ou "campo eq valor"
        String[] parts = splitEquality(expression);
        if (parts == null) {
            return false;
        }
        String field = parts[0].trim();
        String expected = stripQuotes(parts[1].trim());

        Object actual = "input".equalsIgnoreCase(field) ? lastInput : state.get(field);
        return actual != null && String.valueOf(actual).equalsIgnoreCase(expected);
    }

    private String[] splitEquality(String expression) {
        for (String op : new String[]{"==", " eq "}) {
            int idx = expression.indexOf(op);
            if (idx > 0 && idx + op.length() < expression.length()) {
                return new String[]{expression.substring(0, idx), expression.substring(idx + op.length())};
            }
        }
        return null;
    }

    private String stripQuotes(String value) {
        if (value.length() >= 2
                && ((value.startsWith("\"") && value.endsWith("\""))
                    || (value.startsWith("'") && value.endsWith("'")))) {
            return value.substring(1, value.length() - 1);
        }
        return value;
    }

    /**
     * Lê a duração de um node {@code delay} a partir de {@code config}.
     *
     * <p>Aceita, em ordem de prioridade: {@code seconds}, {@code milliseconds}
     * (convertido p/ segundos) e {@code minutes}. Default: 60s (proteção
     * contra config vazia — evita criar wait perpétuo).</p>
     */
    private long parseDelaySeconds(Map<String, Object> config) {
        Object seconds = config.get("seconds");
        if (seconds instanceof Number n) {
            return Math.max(0L, n.longValue());
        }
        Object millis = config.get("milliseconds");
        if (millis instanceof Number n) {
            return Math.max(0L, n.longValue() / 1000L);
        }
        Object minutes = config.get("minutes");
        if (minutes instanceof Number n) {
            return Math.max(0L, n.longValue() * 60L);
        }
        log.warn("Node delay sem seconds/milliseconds/minutes em config — usando default 60s");
        return 60L;
    }

    private String resolveNextNodeId(List<Map<String, Object>> edges,
                                     String sourceId,
                                     String condition) {
        if (sourceId == null) return null;
        Map<String, Object> defaultEdge = null;
        for (Map<String, Object> edge : edges) {
            if (!sourceId.equals(String.valueOf(edge.get("source")))) continue;
            Object edgeCondition = edge.get("condition");
            if (condition == null) {
                if (edgeCondition == null) {
                    return String.valueOf(edge.get("target"));
                }
                if (defaultEdge == null) {
                    defaultEdge = edge;
                }
            } else if (condition.equalsIgnoreCase(String.valueOf(edgeCondition))) {
                return String.valueOf(edge.get("target"));
            }
        }
        return defaultEdge != null ? String.valueOf(defaultEdge.get("target")) : null;
    }

    private Map<String, Object> findNode(List<Map<String, Object>> nodes, String nodeId) {
        if (nodeId == null) return null;
        for (Map<String, Object> node : nodes) {
            if (nodeId.equals(String.valueOf(node.get("id")))) {
                return node;
            }
        }
        return null;
    }

    private void validateTenant(UUID resourceTenantId, UUID tenantId) {
        if (resourceTenantId == null || !resourceTenantId.equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }

    // --- JSON helpers --------------------------------------------------------

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> parseList(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            Object parsed = objectMapper.readValue(json, new TypeReference<Object>() {});
            if (parsed instanceof List) {
                return (List<Map<String, Object>>) parsed;
            }
            return List.of();
        } catch (JsonProcessingException e) {
            log.warn("Falha ao parsear JSON: {}", e.getMessage());
            return List.of();
        }
    }

    private Object parseJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, new TypeReference<Object>() {});
        } catch (JsonProcessingException e) {
            log.warn("Falha ao parsear JSON: {}", e.getMessage());
            return null;
        }
    }

    private Map<String, Object> parseState(String json) {
        if (json == null || json.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (JsonProcessingException e) {
            log.warn("Falha ao parsear executionState: {}", e.getMessage());
            return new HashMap<>();
        }
    }

    private String serializeState(Map<String, Object> state) {
        try {
            return objectMapper.writeValueAsString(state);
        } catch (JsonProcessingException e) {
            log.warn("Falha ao serializar executionState: {}", e.getMessage());
            return "{}";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        return new HashMap<>();
    }

    @SuppressWarnings("unchecked")
    private List<String> parseKeywords(Object value) {
        if (value instanceof List) {
            List<Object> raw = (List<Object>) value;
            return raw.stream().map(String::valueOf).toList();
        }
        if (value instanceof String s) {
            return List.of(s);
        }
        return List.of();
    }

    /**
     * Executa um node {@code type=action} disparando um HTTP request configurado.
     *
     * Config esperada no node (todos opcionais — defaults aplicados):
     * <pre>{
     *   "url": "https://exemplo.com/hook",      // obrigatório — se ausente, vira no-op
     *   "method": "POST",                       // GET, POST, PUT, DELETE (default POST)
     *   "headers": { "X-Token": "abc" },        // opcional
     *   "body": { "phone": "{{phone}}", ... }   // opcional — placeholders {{key}} resolvidos do state
     * }</pre>
     *
     * Falhas HTTP são logadas mas não interrompem o fluxo (action é fire-and-forget).
     */
    @SuppressWarnings("unchecked")
    private void executeActionNode(Map<String, Object> node,
                                   WhatsappFlowExecution execution,
                                   Map<String, Object> state) {
        Map<String, Object> config = asMap(node.get("config"));
        String url = config.get("url") instanceof String s ? s : null;

        if (url == null || url.isBlank()) {
            log.warn("Node action {} sem URL — pulando", node.get("id"));
            return;
        }

        String method = (config.get("method") instanceof String m ? m : "POST").toUpperCase();
        Map<String, Object> headers = asMap(config.get("headers"));
        Object bodyTemplate = config.get("body");
        Object body = resolvePlaceholders(bodyTemplate, state);

        try {
            RestClient.RequestBodySpec spec;
            switch (method) {
                case "GET" -> spec = actionRestClient.method(org.springframework.http.HttpMethod.GET).uri(url);
                case "PUT" -> spec = actionRestClient.put().uri(url);
                case "DELETE" -> spec = actionRestClient.method(org.springframework.http.HttpMethod.DELETE).uri(url);
                default -> spec = actionRestClient.post().uri(url);
            }
            headers.forEach((k, v) -> {
                if (v != null) spec.header(k, v.toString());
            });
            if (body != null && !"GET".equals(method) && !"DELETE".equals(method)) {
                spec.body(body);
            }
            spec.retrieve().toBodilessEntity();

            log.info("Node action {} executado: {} {} (flow={})",
                    node.get("id"), method, url, execution.getFlowId());
        } catch (Exception e) {
            log.error("Falha executando action {} ({} {}): {}",
                    node.get("id"), method, url, e.getMessage());
        }
    }

    /**
     * Substitui {{key}} no template pelo valor correspondente em state.
     * Suporta String e Map recursivamente.
     */
    @SuppressWarnings("unchecked")
    private Object resolvePlaceholders(Object template, Map<String, Object> state) {
        if (template instanceof String s) {
            String result = s;
            for (Map.Entry<String, Object> entry : state.entrySet()) {
                String placeholder = "{{" + entry.getKey() + "}}";
                if (result.contains(placeholder)) {
                    result = result.replace(placeholder, String.valueOf(entry.getValue()));
                }
            }
            return result;
        }
        if (template instanceof Map<?, ?> map) {
            Map<String, Object> resolved = new HashMap<>();
            for (Map.Entry<?, ?> e : map.entrySet()) {
                resolved.put(String.valueOf(e.getKey()), resolvePlaceholders(e.getValue(), state));
            }
            return resolved;
        }
        return template;
    }
}
