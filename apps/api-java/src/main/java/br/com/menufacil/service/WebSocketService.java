package br.com.menufacil.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Envia evento genérico para um tenant específico.
     */
    public void notifyTenant(UUID tenantId, String event, Object data) {
        String destination = "/topic/tenant/" + tenantId;
        Map<String, Object> payload = Map.of(
                "event", event,
                "data", data,
                "timestamp", LocalDateTime.now().toString()
        );
        messagingTemplate.convertAndSend(destination, payload);
        log.debug("WebSocket evento '{}' enviado para tenant {}", event, tenantId);
    }

    /**
     * Envia notificação específica de atualização de pedido.
     */
    public void notifyOrderUpdate(UUID tenantId, UUID orderId, String status) {
        Map<String, Object> orderData = Map.of(
                "orderId", orderId.toString(),
                "status", status
        );
        notifyTenant(tenantId, "order:updated", orderData);
        log.info("WebSocket notificação de pedido {} com status '{}' enviada para tenant {}",
                orderId, status, tenantId);
    }

    /**
     * Envia notificação de novo pedido criado.
     */
    public void notifyNewOrder(UUID tenantId, UUID orderId, int orderNumber) {
        Map<String, Object> orderData = Map.of(
                "orderId", orderId.toString(),
                "orderNumber", orderNumber
        );
        notifyTenant(tenantId, "order:created", orderData);
        log.info("WebSocket notificação de novo pedido #{} enviada para tenant {}",
                orderNumber, tenantId);
    }
}
