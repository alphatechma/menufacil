package br.com.menufacil.controller.whatsapp;

import br.com.menufacil.domain.enums.WhatsappInstanceStatus;
import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.repository.WhatsappInstanceRepository;
import br.com.menufacil.service.whatsapp.FlowEngineService;
import br.com.menufacil.service.whatsapp.WhatsappMessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Webhook receiver para eventos da Evolution API.
 *
 * Endpoint PÚBLICO (sem autenticação) — Evolution API chama diretamente
 * o servidor com eventos como messages.upsert e connection.update.
 *
 * Toda lógica está envolvida em try/catch para garantir que o webhook
 * NUNCA retorne 5xx — caso contrário a Evolution API faz retentativas.
 */
@Slf4j
@Tag(name = "WhatsApp Webhook", description = "Recebe eventos da Evolution API (público)")
@RestController
@RequestMapping("/whatsapp/webhook")
@RequiredArgsConstructor
public class WhatsappWebhookController {

    private final WhatsappInstanceRepository whatsappInstanceRepository;
    private final WhatsappMessageService whatsappMessageService;
    private final FlowEngineService flowEngineService;

    @Operation(summary = "Receber evento da Evolution API",
            description = "Endpoint público chamado pela Evolution API com eventos do WhatsApp")
    @PostMapping({"", "/{event}"})
    public ResponseEntity<Map<String, Object>> handleWebhook(
            @RequestBody(required = false) Map<String, Object> payload,
            @RequestHeader(value = "X-Tenant-Slug", required = false) String tenantSlugHeader) {

        Map<String, Object> okResponse = new HashMap<>();
        okResponse.put("ok", true);

        if (payload == null) {
            log.warn("Webhook recebido com payload nulo");
            return ResponseEntity.ok(okResponse);
        }

        try {
            String event = stringValue(payload.get("event"));
            String instanceName = stringValue(payload.get("instance"));
            Object dataObj = payload.get("data");

            log.info("Webhook Evolution API recebido: event={} instance={}", event, instanceName);

            UUID tenantId = resolveTenantId(instanceName, tenantSlugHeader);
            if (tenantId == null) {
                log.warn("Não foi possível resolver tenantId para instance={} slug={}",
                        instanceName, tenantSlugHeader);
                return ResponseEntity.ok(okResponse);
            }

            if ("messages.upsert".equalsIgnoreCase(event)) {
                handleMessagesUpsert(tenantId, instanceName, dataObj);
            } else if ("connection.update".equalsIgnoreCase(event)) {
                handleConnectionUpdate(instanceName, dataObj);
            } else {
                log.debug("Evento de webhook não tratado: {}", event);
            }
        } catch (Exception e) {
            // NUNCA retornar 5xx pro Evolution — apenas logamos.
            log.error("Erro processando webhook da Evolution API: {}", e.getMessage(), e);
        }

        return ResponseEntity.ok(okResponse);
    }

    // --- handlers ------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private void handleMessagesUpsert(UUID tenantId, String instanceName, Object dataObj) {
        if (!(dataObj instanceof Map)) {
            log.debug("messages.upsert sem objeto data válido");
            return;
        }
        Map<String, Object> data = (Map<String, Object>) dataObj;

        Map<String, Object> key = asMap(data.get("key"));
        Object fromMe = key.get("fromMe");
        if (Boolean.TRUE.equals(fromMe)) {
            log.debug("Ignorando mensagem enviada por nós mesmos (fromMe=true)");
            return;
        }

        String remoteJid = stringValue(key.get("remoteJid"));
        String phone = extractPhone(remoteJid);

        Map<String, Object> message = asMap(data.get("message"));
        String content = extractContent(message);

        if (phone == null || phone.isBlank() || content == null || content.isBlank()) {
            log.warn("Mensagem ignorada (phone ou content vazios): phone={} contentEmpty={}",
                    phone, content == null || content.isBlank());
            return;
        }

        try {
            whatsappMessageService.receiveMessage(tenantId, instanceName, phone, content);
        } catch (Exception e) {
            log.error("Falha ao persistir mensagem recebida: {}", e.getMessage(), e);
        }

        // Dispara o engine de forma assíncrona — webhook responde 200 imediatamente
        // e o processamento do fluxo ocorre em outro thread (sem bloquear Evolution).
        flowEngineService.processIncomingMessageAsync(tenantId, phone, content);
    }

    private void handleConnectionUpdate(String instanceName, Object dataObj) {
        if (instanceName == null || instanceName.isBlank()) {
            log.debug("connection.update sem instanceName");
            return;
        }
        Optional<WhatsappInstance> opt = whatsappInstanceRepository.findByInstanceName(instanceName);
        if (opt.isEmpty()) {
            log.warn("connection.update para instância desconhecida: {}", instanceName);
            return;
        }

        WhatsappInstance instance = opt.get();
        Map<String, Object> data = asMap(dataObj);
        String state = stringValue(data.get("state"));
        String wid = stringValue(data.get("wid"));

        WhatsappInstanceStatus newStatus = mapStateToStatus(state, instance.getStatus());
        instance.setStatus(newStatus);

        if (wid != null && !wid.isBlank()) {
            instance.setPhoneNumber(wid);
        }
        if (newStatus == WhatsappInstanceStatus.disconnected) {
            instance.setQrCode(null);
        }

        whatsappInstanceRepository.save(instance);
        log.info("Status da instância {} atualizado para {}", instanceName, newStatus);
    }

    // --- helpers -------------------------------------------------------------

    /**
     * Resolve tenantId pelo header X-Tenant-Slug ou pelo instanceName.
     * Prioridade: instanceName (mais confiável vindo da Evolution).
     */
    private UUID resolveTenantId(String instanceName, String tenantSlugHeader) {
        if (instanceName != null && !instanceName.isBlank()) {
            Optional<WhatsappInstance> opt = whatsappInstanceRepository.findByInstanceName(instanceName);
            if (opt.isPresent() && opt.get().getTenantId() != null) {
                return opt.get().getTenantId();
            }
        }
        if (tenantSlugHeader != null && !tenantSlugHeader.isBlank()) {
            // Header pode trazer UUID direto em casos de teste/manual
            try {
                return UUID.fromString(tenantSlugHeader);
            } catch (IllegalArgumentException ignored) {
                // não era UUID, ignora
            }
        }
        return null;
    }

    private WhatsappInstanceStatus mapStateToStatus(String state, WhatsappInstanceStatus fallback) {
        if (state == null) return fallback;
        return switch (state.toLowerCase()) {
            case "open", "connected" -> WhatsappInstanceStatus.connected;
            case "connecting" -> WhatsappInstanceStatus.connecting;
            case "close", "closed", "disconnected" -> WhatsappInstanceStatus.disconnected;
            default -> fallback;
        };
    }

    private String extractPhone(String remoteJid) {
        if (remoteJid == null || remoteJid.isBlank()) return null;
        String cleaned = remoteJid
                .replace("@s.whatsapp.net", "")
                .replace("@c.us", "")
                .replace("@lid", "")
                .replace("@g.us", "");
        return cleaned.replaceAll("[^0-9]", "");
    }

    @SuppressWarnings("unchecked")
    private String extractContent(Map<String, Object> message) {
        if (message == null || message.isEmpty()) return null;

        Object conversation = message.get("conversation");
        if (conversation instanceof String s && !s.isBlank()) return s;

        Object extended = message.get("extendedTextMessage");
        if (extended instanceof Map ext) {
            Object text = ext.get("text");
            if (text instanceof String s && !s.isBlank()) return s;
        }

        Object buttons = message.get("buttonsResponseMessage");
        if (buttons instanceof Map br) {
            Object selected = br.get("selectedDisplayText");
            if (selected instanceof String s && !s.isBlank()) return s;
        }

        Object list = message.get("listResponseMessage");
        if (list instanceof Map lr) {
            Object title = lr.get("title");
            if (title instanceof String s && !s.isBlank()) return s;
        }

        return null;
    }

    private String stringValue(Object value) {
        if (value == null) return null;
        if (value instanceof String s) return s;
        return String.valueOf(value);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map) {
            return (Map<String, Object>) value;
        }
        return new HashMap<>();
    }
}
