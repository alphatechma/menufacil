package br.com.menufacil.service.whatsapp;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Cliente HTTP para a Evolution API (WhatsApp).
 * Encapsula as chamadas externas para criação e gerenciamento de instâncias.
 */
@Slf4j
@Service
public class EvolutionApiService {

    private final String baseUrl;
    private final String apiKey;
    private RestClient restClient;

    public EvolutionApiService(
            @Value("${evolution.api.url:http://localhost:8080}") String baseUrl,
            @Value("${evolution.api.key:}") String apiKey) {
        this.baseUrl = baseUrl != null ? baseUrl.replaceAll("/+$", "") : "";
        this.apiKey = apiKey != null ? apiKey : "";
    }

    @PostConstruct
    void init() {
        if (this.restClient == null) {
            this.restClient = RestClient.builder()
                    .baseUrl(this.baseUrl)
                    .defaultHeader("apikey", this.apiKey)
                    .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                    .build();
        }
    }

    /** Permite injetar um RestClient customizado em testes. */
    public void setRestClient(RestClient restClient) {
        this.restClient = restClient;
    }

    public Map<String, Object> createInstance(String instanceName, String webhookUrl) {
        Map<String, Object> body = new HashMap<>();
        body.put("instanceName", instanceName);
        body.put("integration", "WHATSAPP-BAILEYS");
        body.put("qrcode", false);
        body.put("rejectCall", false);
        body.put("groupsIgnore", true);
        body.put("alwaysOnline", false);
        body.put("readMessages", false);
        body.put("readStatus", false);
        body.put("syncFullHistory", false);
        if (webhookUrl != null && !webhookUrl.isBlank()) {
            Map<String, Object> webhook = new HashMap<>();
            webhook.put("url", webhookUrl);
            webhook.put("byEvents", true);
            webhook.put("base64", false);
            webhook.put("events", List.of(
                    "CONNECTION_UPDATE", "MESSAGES_UPSERT", "MESSAGES_UPDATE", "QRCODE_UPDATED"));
            body.put("webhook", webhook);
        }
        return postJson("/instance/create", body, "Falha ao criar instância no Evolution API");
    }

    @SuppressWarnings("unchecked")
    public InstanceStatusResponse connectInstance(String instanceName) {
        Map<String, Object> response = getJson(
                "/instance/connect/" + instanceName,
                "Falha ao conectar instância no Evolution API");

        String qrCode = null;
        if (response != null) {
            Object base64 = response.get("base64");
            Object code = response.get("code");
            qrCode = base64 != null ? base64.toString() : (code != null ? code.toString() : null);
        }
        return new InstanceStatusResponse("connecting", null, qrCode);
    }

    public Map<String, Object> disconnectInstance(String instanceName) {
        Map<String, Object> logout = deleteJson(
                "/instance/logout/" + instanceName,
                "Falha ao desconectar instância no Evolution API");
        deleteJson("/instance/delete/" + instanceName,
                "Falha ao remover instância no Evolution API");
        return logout;
    }

    @SuppressWarnings("unchecked")
    public InstanceStatusResponse getInstanceStatus(String instanceName) {
        Map<String, Object> response = getJson(
                "/instance/connectionState/" + instanceName,
                "Falha ao consultar status no Evolution API");

        String state = "disconnected";
        String phoneNumber = null;
        if (response != null) {
            Object instance = response.get("instance");
            if (instance instanceof Map<?, ?> map) {
                Object stateObj = map.get("state");
                if (stateObj != null) {
                    state = stateObj.toString();
                }
                Object owner = map.get("owner");
                if (owner != null) {
                    phoneNumber = owner.toString().replace("@s.whatsapp.net", "");
                }
            }
        }
        return new InstanceStatusResponse(state, phoneNumber, null);
    }

    public Map<String, Object> sendTextMessage(String instanceName, String phone, String content) {
        Map<String, Object> body = new HashMap<>();
        body.put("number", phone);
        body.put("text", content);
        body.put("delay", 1000);
        body.put("linkPreview", true);
        return postJson(
                "/message/sendText/" + instanceName,
                body,
                "Falha ao enviar mensagem no Evolution API");
    }

    public Map<String, Object> sendTemplate(
            String instanceName,
            String phone,
            String templateName,
            Map<String, Object> variables) {
        Map<String, Object> body = new HashMap<>();
        body.put("number", phone);
        body.put("templateName", templateName);
        body.put("variables", variables != null ? variables : Map.of());
        body.put("delay", 1000);
        return postJson(
                "/message/sendTemplate/" + instanceName,
                body,
                "Falha ao enviar template no Evolution API");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> getJson(String path, String errorMessage) {
        try {
            return restClient.get().uri(path).retrieve().body(Map.class);
        } catch (RestClientException e) {
            log.error("Evolution API GET {} falhou: {}", path, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    errorMessage + ": " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> postJson(String path, Map<String, Object> body, String errorMessage) {
        try {
            return restClient.post().uri(path).body(body).retrieve().body(Map.class);
        } catch (RestClientException e) {
            log.error("Evolution API POST {} falhou: {}", path, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    errorMessage + ": " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> deleteJson(String path, String errorMessage) {
        try {
            return restClient.delete().uri(path).retrieve().body(Map.class);
        } catch (RestClientException e) {
            log.error("Evolution API DELETE {} falhou: {}", path, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    errorMessage + ": " + e.getMessage());
        }
    }

    /** Resposta normalizada de status / conexão de instância. */
    public record InstanceStatusResponse(String status, String phoneNumber, String qrCode) {
    }
}
