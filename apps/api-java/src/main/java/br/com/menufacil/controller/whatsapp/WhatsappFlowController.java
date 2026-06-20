package br.com.menufacil.controller.whatsapp;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateWhatsappFlowRequest;
import br.com.menufacil.dto.TestFlowRequest;
import br.com.menufacil.dto.TestFlowResponse;
import br.com.menufacil.dto.ValidateFlowResponse;
import br.com.menufacil.dto.WhatsappFlowResponse;
import br.com.menufacil.service.whatsapp.WhatsappFlowService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "WhatsApp Flows", description = "Gerenciamento de fluxos de automação do WhatsApp")
@RestController
@RequestMapping("/whatsapp/flows")
@RequiredArgsConstructor
public class WhatsappFlowController {

    private final WhatsappFlowService flowService;

    @Operation(summary = "Listar fluxos do tenant")
    @GetMapping
    public ResponseEntity<List<WhatsappFlowResponse>> list() {
        return ResponseEntity.ok(flowService.listByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar fluxo por id")
    @GetMapping("/{id}")
    public ResponseEntity<WhatsappFlowResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(flowService.getById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar fluxo")
    @PostMapping
    public ResponseEntity<WhatsappFlowResponse> create(@Valid @RequestBody CreateWhatsappFlowRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(flowService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Atualizar fluxo")
    @PutMapping("/{id}")
    public ResponseEntity<WhatsappFlowResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateWhatsappFlowRequest request) {
        return ResponseEntity.ok(flowService.update(id, TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Remover fluxo")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        flowService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Duplicar fluxo")
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<WhatsappFlowResponse> duplicate(@PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(flowService.duplicate(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Validar estrutura do fluxo")
    @PostMapping("/{id}/validate")
    public ResponseEntity<ValidateFlowResponse> validate(@PathVariable UUID id) {
        return ResponseEntity.ok(flowService.validate(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Iniciar execução de teste do fluxo")
    @PostMapping("/{id}/test")
    public ResponseEntity<TestFlowResponse> test(
            @PathVariable UUID id,
            @Valid @RequestBody TestFlowRequest request) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(flowService.test(id, TenantContext.getRequiredTenantUUID(), request));
    }
}
