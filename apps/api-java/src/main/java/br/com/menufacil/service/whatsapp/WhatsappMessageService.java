package br.com.menufacil.service.whatsapp;

import br.com.menufacil.converter.WhatsappMessageConverter;
import br.com.menufacil.domain.enums.WhatsappMessageDirection;
import br.com.menufacil.domain.models.WhatsappInstance;
import br.com.menufacil.domain.models.WhatsappMessage;
import br.com.menufacil.dto.ConversationResponse;
import br.com.menufacil.dto.SendWhatsappMessageRequest;
import br.com.menufacil.dto.WhatsappMessageResponse;
import br.com.menufacil.repository.WhatsappInstanceRepository;
import br.com.menufacil.repository.WhatsappMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Serviço de envio, recebimento e listagem de mensagens WhatsApp.
 *
 * Integração com Evolution API marcada como TODO — depende do EvolutionApiService
 * criado pelo agent whatsapp-instance. Quando disponível, injete via construtor
 * e descomente os trechos marcados.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WhatsappMessageService {

    private final WhatsappMessageRepository whatsappMessageRepository;
    private final WhatsappInstanceRepository whatsappInstanceRepository;
    private final WhatsappMessageConverter whatsappMessageConverter;
    // TODO: injetar EvolutionApiService criado pelo agent whatsapp-instance
    // private final EvolutionApiService evolutionApiService;

    /**
     * Lista conversas agrupadas por telefone para o tenant.
     * Usa a última mensagem de cada conversa como preview.
     */
    public List<ConversationResponse> listConversations(UUID tenantId) {
        List<WhatsappMessage> lastMessages =
                whatsappMessageRepository.findDistinctPhoneByTenantId(tenantId);

        List<ConversationResponse> conversations = new ArrayList<>();
        for (WhatsappMessage last : lastMessages) {
            conversations.add(ConversationResponse.builder()
                    .phone(last.getPhone())
                    .lastMessage(last.getContent())
                    .lastMessageAt(last.getCreatedAt())
                    .unread(0L)
                    .build());
        }
        return conversations;
    }

    /**
     * Retorna mensagens de uma conversa específica ordenadas por data desc.
     */
    public List<WhatsappMessageResponse> getMessagesByPhone(UUID tenantId, String phone) {
        return whatsappMessageRepository
                .findByTenantIdAndPhoneOrderByCreatedAtDesc(tenantId, phone)
                .stream()
                .map(whatsappMessageConverter::toResponse)
                .toList();
    }

    /**
     * Envia mensagem (texto livre ou template) via Evolution API
     * e persiste registro como outbound (delivered=true).
     */
    @Transactional
    public WhatsappMessageResponse sendMessage(UUID tenantId, SendWhatsappMessageRequest request) {
        WhatsappInstance instance = whatsappInstanceRepository
                .findByInstanceNameAndTenantId(request.getInstanceName(), tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Instância do WhatsApp não encontrada"));

        // TODO: integrar com EvolutionApiService
        // if (request.getTemplateName() != null && !request.getTemplateName().isBlank()) {
        //     evolutionApiService.sendTemplate(
        //             instance.getInstanceName(), request.getPhone(),
        //             request.getTemplateName(), request.getVariables());
        // } else {
        //     evolutionApiService.sendTextMessage(
        //             instance.getInstanceName(), request.getPhone(), request.getContent());
        // }

        WhatsappMessage message = new WhatsappMessage();
        message.setTenantId(tenantId);
        message.setInstanceId(instance.getId());
        message.setPhone(request.getPhone());
        message.setDirection(WhatsappMessageDirection.out);
        message.setContent(request.getContent());
        message.setTemplateUsed(request.getTemplateName());
        message.setDelivered(true);

        message = whatsappMessageRepository.save(message);
        log.info("Mensagem WhatsApp enviada para {} no tenant {}", request.getPhone(), tenantId);
        return whatsappMessageConverter.toResponse(message);
    }

    /**
     * Envia mensagem outbound disparada por automação (ex: FlowEngine),
     * sem precisar de {@link SendWhatsappMessageRequest}.
     *
     * Usa a primeira instância do tenant como remetente (caso não exista,
     * persiste apenas o registro sem instância e delivered=false).
     *
     * TODO: integrar envio real via EvolutionApiService.
     */
    @Transactional
    public WhatsappMessage sendOutbound(UUID tenantId, String phone, String content) {
        WhatsappMessage message = new WhatsappMessage();
        message.setTenantId(tenantId);
        message.setPhone(phone);
        message.setDirection(WhatsappMessageDirection.out);
        message.setContent(content);
        message.setDelivered(false);

        whatsappInstanceRepository.findByTenantId(tenantId).stream()
                .findFirst()
                .ifPresent(instance -> message.setInstanceId(instance.getId()));

        WhatsappMessage saved = whatsappMessageRepository.save(message);
        log.info("Mensagem outbound enfileirada para {} no tenant {} (id={})",
                phone, tenantId, saved.getId());
        return saved;
    }

    /**
     * Persiste mensagem recebida via webhook como inbound.
     * Chamado pelo WebhookController (outro módulo).
     */
    @Transactional
    public WhatsappMessageResponse receiveMessage(UUID tenantId, String instanceName,
                                                  String fromPhone, String content) {
        WhatsappInstance instance = whatsappInstanceRepository
                .findByInstanceNameAndTenantId(instanceName, tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Instância do WhatsApp não encontrada"));

        WhatsappMessage message = new WhatsappMessage();
        message.setTenantId(tenantId);
        message.setInstanceId(instance.getId());
        message.setPhone(fromPhone);
        message.setDirection(WhatsappMessageDirection.in);
        message.setContent(content);
        message.setDelivered(true);

        message = whatsappMessageRepository.save(message);
        log.info("Mensagem WhatsApp recebida de {} no tenant {}", fromPhone, tenantId);
        return whatsappMessageConverter.toResponse(message);
    }
}
