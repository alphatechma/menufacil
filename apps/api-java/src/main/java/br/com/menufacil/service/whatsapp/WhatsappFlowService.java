package br.com.menufacil.service.whatsapp;

import br.com.menufacil.converter.WhatsappFlowConverter;
import br.com.menufacil.domain.models.WhatsappFlow;
import br.com.menufacil.domain.models.WhatsappFlowExecution;
import br.com.menufacil.dto.CreateWhatsappFlowRequest;
import br.com.menufacil.dto.TestFlowRequest;
import br.com.menufacil.dto.TestFlowResponse;
import br.com.menufacil.dto.ValidateFlowResponse;
import br.com.menufacil.dto.WhatsappFlowResponse;
import br.com.menufacil.repository.WhatsappFlowExecutionRepository;
import br.com.menufacil.repository.WhatsappFlowRepository;
import br.com.menufacil.service.AuditLogService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WhatsappFlowService {

    private final WhatsappFlowRepository flowRepository;
    private final WhatsappFlowExecutionRepository flowExecutionRepository;
    private final WhatsappFlowConverter flowConverter;
    private final ObjectMapper objectMapper;
    private final AuditLogService auditLogService;

    public List<WhatsappFlowResponse> listByTenant(UUID tenantId) {
        return flowRepository.findByTenantIdOrderByPriorityDescCreatedAtDesc(tenantId).stream()
                .map(flowConverter::toResponse)
                .toList();
    }

    public WhatsappFlowResponse getById(UUID id, UUID tenantId) {
        WhatsappFlow flow = flowRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fluxo não encontrado"));

        validateTenant(flow, tenantId);
        return flowConverter.toResponse(flow);
    }

    @Transactional
    public WhatsappFlowResponse create(UUID tenantId, CreateWhatsappFlowRequest request) {
        WhatsappFlow flow = flowConverter.toEntity(request);
        flow.setTenantId(tenantId);

        flow = flowRepository.save(flow);
        log.info("Fluxo WhatsApp criado: {} no tenant {}", flow.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("name", flow.getName());
            details.put("triggerType", flow.getTriggerType() != null ? flow.getTriggerType().name() : null);
            details.put("active", flow.isActive());
            details.put("priority", flow.getPriority());
            auditLogService.log(
                    flow.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "whatsapp_flow",
                    flow.getId(),
                    flow.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de create WhatsApp flow: {}", e.getMessage());
        }

        return flowConverter.toResponse(flow);
    }

    @Transactional
    public WhatsappFlowResponse update(UUID id, UUID tenantId, CreateWhatsappFlowRequest request) {
        WhatsappFlow flow = flowRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fluxo não encontrado"));

        validateTenant(flow, tenantId);

        String oldName = flow.getName();
        boolean oldActive = flow.isActive();
        int oldPriority = flow.getPriority();

        flowConverter.updateFromRequest(request, flow);

        flow = flowRepository.save(flow);
        log.info("Fluxo WhatsApp atualizado: {} no tenant {}", flow.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldName", oldName);
            details.put("newName", flow.getName());
            details.put("oldActive", oldActive);
            details.put("newActive", flow.isActive());
            details.put("oldPriority", oldPriority);
            details.put("newPriority", flow.getPriority());
            details.put("triggerType", flow.getTriggerType() != null ? flow.getTriggerType().name() : null);
            auditLogService.log(
                    flow.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "whatsapp_flow",
                    flow.getId(),
                    flow.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de update WhatsApp flow: {}", e.getMessage());
        }

        return flowConverter.toResponse(flow);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        WhatsappFlow flow = flowRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fluxo não encontrado"));

        validateTenant(flow, tenantId);

        UUID flowId = flow.getId();
        String flowName = flow.getName();
        UUID flowTenantId = flow.getTenantId();

        flowRepository.delete(flow);
        log.info("Fluxo WhatsApp removido: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    flowTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "whatsapp_flow",
                    flowId,
                    flowName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de delete WhatsApp flow: {}", e.getMessage());
        }
    }

    @Transactional
    public WhatsappFlowResponse duplicate(UUID id, UUID tenantId) {
        WhatsappFlow source = flowRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fluxo não encontrado"));

        validateTenant(source, tenantId);

        WhatsappFlow copy = new WhatsappFlow();
        copy.setTenantId(tenantId);
        copy.setName("Cópia de " + source.getName());
        copy.setDescription(source.getDescription());
        copy.setTriggerType(source.getTriggerType());
        copy.setTriggerConfig(source.getTriggerConfig());
        copy.setNodes(source.getNodes());
        copy.setEdges(source.getEdges());
        copy.setActive(false);
        copy.setPriority(source.getPriority());

        copy = flowRepository.save(copy);
        log.info("Fluxo WhatsApp duplicado: {} -> {} no tenant {}", id, copy.getId(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("sourceFlowId", source.getId().toString());
            details.put("sourceName", source.getName());
            details.put("newName", copy.getName());
            details.put("triggerType", copy.getTriggerType() != null ? copy.getTriggerType().name() : null);
            auditLogService.log(
                    copy.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "duplicate",
                    "whatsapp_flow",
                    copy.getId(),
                    copy.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de duplicate WhatsApp flow: {}", e.getMessage());
        }

        return flowConverter.toResponse(copy);
    }

    public ValidateFlowResponse validate(UUID id, UUID tenantId) {
        WhatsappFlow flow = flowRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fluxo não encontrado"));

        validateTenant(flow, tenantId);

        List<String> errors = validateFlowContent(flow);
        return ValidateFlowResponse.builder()
                .valid(errors.isEmpty())
                .errors(errors)
                .build();
    }

    @Transactional
    public TestFlowResponse test(UUID id, UUID tenantId, TestFlowRequest request) {
        WhatsappFlow flow = flowRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Fluxo não encontrado"));

        validateTenant(flow, tenantId);

        WhatsappFlowExecution execution = new WhatsappFlowExecution();
        execution.setTenantId(tenantId);
        execution.setFlowId(flow.getId());
        execution.setPhone(request.getPhone());
        execution.setExecutionState("{}");
        execution.setActive(true);
        execution.setStartedAt(LocalDateTime.now());

        execution = flowExecutionRepository.save(execution);
        log.info("Teste de fluxo iniciado: {} para telefone {} no tenant {}",
                execution.getId(), request.getPhone(), tenantId);

        return TestFlowResponse.builder()
                .executionId(execution.getId().toString())
                .status("started")
                .build();
    }

    private List<String> validateFlowContent(WhatsappFlow flow) {
        List<String> errors = new ArrayList<>();

        JsonNode nodesNode = parseJson(flow.getNodes(), "nodes", errors);
        JsonNode edgesNode = parseJson(flow.getEdges(), "edges", errors);

        if (nodesNode == null || edgesNode == null) {
            return errors;
        }

        if (!nodesNode.isArray()) {
            errors.add("Campo 'nodes' deve ser uma lista");
            return errors;
        }
        if (!edgesNode.isArray()) {
            errors.add("Campo 'edges' deve ser uma lista");
            return errors;
        }

        int startCount = 0;
        Set<String> nodeIds = new HashSet<>();
        for (JsonNode node : nodesNode) {
            JsonNode idNode = node.get("id");
            if (idNode == null || idNode.asText().isBlank()) {
                errors.add("Existe nó sem id");
                continue;
            }
            String nodeId = idNode.asText();
            nodeIds.add(nodeId);

            JsonNode typeNode = node.get("type");
            String type = typeNode != null ? typeNode.asText("") : "";
            if ("start".equalsIgnoreCase(type) || "startNode".equalsIgnoreCase(type) || "trigger".equalsIgnoreCase(type)) {
                startCount++;
            }
        }

        if (startCount == 0) {
            errors.add("O fluxo precisa ter exatamente 1 nó de início");
        } else if (startCount > 1) {
            errors.add("O fluxo possui mais de 1 nó de início; apenas 1 é permitido");
        }

        for (JsonNode edge : edgesNode) {
            JsonNode sourceNode = edge.get("source");
            JsonNode targetNode = edge.get("target");
            String source = sourceNode != null ? sourceNode.asText("") : "";
            String target = targetNode != null ? targetNode.asText("") : "";

            if (source.isBlank() || target.isBlank()) {
                errors.add("Existe conexão sem origem ou destino");
                continue;
            }
            if (!nodeIds.contains(source)) {
                errors.add("Conexão referencia nó de origem inexistente: " + source);
            }
            if (!nodeIds.contains(target)) {
                errors.add("Conexão referencia nó de destino inexistente: " + target);
            }
        }

        if (hasCycle(nodesNode, edgesNode)) {
            errors.add("O fluxo contém ciclos; remova conexões circulares");
        }

        return errors;
    }

    private JsonNode parseJson(String raw, String field, List<String> errors) {
        if (raw == null || raw.isBlank()) {
            errors.add("Campo '" + field + "' é obrigatório");
            return null;
        }
        try {
            return objectMapper.readTree(raw);
        } catch (Exception e) {
            errors.add("Campo '" + field + "' contém JSON inválido");
            return null;
        }
    }

    private boolean hasCycle(JsonNode nodes, JsonNode edges) {
        Set<String> ids = new HashSet<>();
        for (JsonNode node : nodes) {
            JsonNode idNode = node.get("id");
            if (idNode != null) {
                ids.add(idNode.asText());
            }
        }

        java.util.Map<String, List<String>> adj = new java.util.HashMap<>();
        for (String id : ids) {
            adj.put(id, new ArrayList<>());
        }
        for (JsonNode edge : edges) {
            JsonNode s = edge.get("source");
            JsonNode t = edge.get("target");
            if (s == null || t == null) continue;
            String src = s.asText();
            String tgt = t.asText();
            if (ids.contains(src) && ids.contains(tgt)) {
                adj.get(src).add(tgt);
            }
        }

        Set<String> visited = new HashSet<>();
        Set<String> stack = new HashSet<>();
        for (String id : ids) {
            if (dfsDetectCycle(id, adj, visited, stack)) {
                return true;
            }
        }
        return false;
    }

    private boolean dfsDetectCycle(String node,
                                   java.util.Map<String, List<String>> adj,
                                   Set<String> visited,
                                   Set<String> stack) {
        if (stack.contains(node)) return true;
        if (visited.contains(node)) return false;
        visited.add(node);
        stack.add(node);
        for (String next : adj.getOrDefault(node, List.of())) {
            if (dfsDetectCycle(next, adj, visited, stack)) {
                return true;
            }
        }
        stack.remove(node);
        return false;
    }

    private void validateTenant(WhatsappFlow flow, UUID tenantId) {
        if (!flow.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object details = auth.getDetails();
        if (details instanceof Claims claims) {
            String userId = claims.get("userId", String.class);
            if (userId != null && !userId.isBlank()) {
                try { return UUID.fromString(userId); } catch (IllegalArgumentException ignored) {}
            }
        }
        return null;
    }

    private String getCurrentIpAddress() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String forwarded = req.getHeader("X-Forwarded-For");
                if (forwarded != null && !forwarded.isBlank()) {
                    return forwarded.split(",")[0].trim();
                }
                return req.getRemoteAddr();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String serializeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception e) {
            return details.toString();
        }
    }
}
