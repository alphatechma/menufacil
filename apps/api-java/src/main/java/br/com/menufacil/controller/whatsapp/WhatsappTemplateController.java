package br.com.menufacil.controller.whatsapp;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateWhatsappTemplateRequest;
import br.com.menufacil.dto.WhatsappTemplateResponse;
import br.com.menufacil.service.whatsapp.WhatsappTemplateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "WhatsApp Templates", description = "Gerenciamento de templates de mensagens do WhatsApp")
@RestController
@RequestMapping("/whatsapp/templates")
@RequiredArgsConstructor
public class WhatsappTemplateController {

    private final WhatsappTemplateService templateService;

    @Operation(summary = "Listar templates do tenant")
    @GetMapping
    public ResponseEntity<List<WhatsappTemplateResponse>> list() {
        return ResponseEntity.ok(templateService.listByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar template por id")
    @GetMapping("/{id}")
    public ResponseEntity<WhatsappTemplateResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(templateService.getById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar template")
    @PostMapping
    public ResponseEntity<WhatsappTemplateResponse> create(@Valid @RequestBody CreateWhatsappTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(templateService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar template")
    @PutMapping("/{id}")
    public ResponseEntity<WhatsappTemplateResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateWhatsappTemplateRequest request) {
        return ResponseEntity.ok(templateService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover template")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        templateService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }
}
