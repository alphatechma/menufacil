package br.com.menufacil.controller.whatsapp;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.ConversationResponse;
import br.com.menufacil.dto.SendWhatsappMessageRequest;
import br.com.menufacil.dto.WhatsappMessageResponse;
import br.com.menufacil.service.whatsapp.WhatsappMessageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "WhatsApp - Mensagens", description = "Conversas e mensagens WhatsApp do tenant")
@RestController
@RequestMapping("/whatsapp")
@RequiredArgsConstructor
public class WhatsappMessageController {

    private final WhatsappMessageService whatsappMessageService;

    @Operation(summary = "Listar conversas do tenant agrupadas por telefone")
    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationResponse>> listConversations() {
        return ResponseEntity.ok(
                whatsappMessageService.listConversations(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar mensagens de uma conversa pelo telefone")
    @GetMapping("/conversations/{phone}")
    public ResponseEntity<List<WhatsappMessageResponse>> getMessagesByPhone(
            @PathVariable String phone) {
        return ResponseEntity.ok(
                whatsappMessageService.getMessagesByPhone(
                        TenantContext.getRequiredTenantUUID(), phone));
    }

    @Operation(summary = "Enviar mensagem WhatsApp (texto livre ou template)")
    @PostMapping("/messages/send")
    public ResponseEntity<WhatsappMessageResponse> sendMessage(
            @Valid @RequestBody SendWhatsappMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                whatsappMessageService.sendMessage(
                        TenantContext.getRequiredTenantUUID(), request));
    }
}
