package br.com.menufacil.service.notification;

import java.util.UUID;

/**
 * Abstração para envio de mensagens WhatsApp via instância do tenant.
 *
 * Implementação padrão: {@link EvolutionWhatsappSender} (Evolution API).
 */
public interface WhatsappSender {

    /**
     * Envia uma mensagem de texto via WhatsApp usando a instância default do tenant.
     *
     * @param tenantId tenant dono da instância WhatsApp
     * @param phone    número de destino (com DDI/DDD)
     * @param message  conteúdo da mensagem
     */
    void send(UUID tenantId, String phone, String message);
}
