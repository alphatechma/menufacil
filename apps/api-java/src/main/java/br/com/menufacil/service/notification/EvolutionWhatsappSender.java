package br.com.menufacil.service.notification;

import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.repository.WhatsappInstanceRepository;
import br.com.menufacil.service.whatsapp.EvolutionApiService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Envio de mensagens WhatsApp via Evolution API.
 *
 * Usa a primeira instância cadastrada do tenant (ordenada por createdAt asc).
 * Caso o tenant ainda não tenha instância configurada, lança {@link RuntimeException}
 * que é capturada pelo {@link NotificationWorker} e marca a notificação como failed.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EvolutionWhatsappSender implements WhatsappSender {

    private final EvolutionApiService evolutionApiService;
    private final WhatsappInstanceRepository whatsappInstanceRepository;

    @Override
    public void send(UUID tenantId, String phone, String message) {
        WhatsappInstance instance = whatsappInstanceRepository
                .findFirstByTenantIdOrderByCreatedAtAsc(tenantId)
                .orElseThrow(() -> new RuntimeException(
                        "Tenant nao tem instancia WhatsApp configurada"));

        log.debug("EvolutionWhatsappSender: enviando mensagem tenant={} instance={} phone={}",
                tenantId, instance.getInstanceName(), phone);

        evolutionApiService.sendTextMessage(instance.getInstanceName(), phone, message);
    }
}
