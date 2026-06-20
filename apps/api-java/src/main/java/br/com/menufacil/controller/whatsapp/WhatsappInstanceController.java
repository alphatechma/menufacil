package br.com.menufacil.controller.whatsapp;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.ConnectInstanceRequest;
import br.com.menufacil.dto.WhatsappInstanceResponse;
import br.com.menufacil.service.whatsapp.WhatsappInstanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "WhatsApp Instâncias", description = "Gerenciamento de instâncias do WhatsApp via Evolution API")
@RestController
@RequestMapping("/whatsapp/instance")
@RequiredArgsConstructor
public class WhatsappInstanceController {

    private final WhatsappInstanceService instanceService;

    @Operation(summary = "Listar instâncias do tenant")
    @GetMapping
    public ResponseEntity<List<WhatsappInstanceResponse>> list() {
        return ResponseEntity.ok(
                instanceService.listByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Conectar uma nova instância (gera QR Code)")
    @PostMapping("/connect")
    public ResponseEntity<WhatsappInstanceResponse> connect(
            @Valid @RequestBody ConnectInstanceRequest request) {
        return ResponseEntity.ok(
                instanceService.connect(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Desconectar uma instância existente")
    @PostMapping("/disconnect/{instanceName}")
    public ResponseEntity<WhatsappInstanceResponse> disconnect(@PathVariable String instanceName) {
        return ResponseEntity.ok(
                instanceService.disconnect(TenantContext.getRequiredTenantUUID(), instanceName));
    }

    @Operation(summary = "Consultar status atualizado de uma instância")
    @GetMapping("/status/{instanceName}")
    public ResponseEntity<WhatsappInstanceResponse> status(@PathVariable String instanceName) {
        return ResponseEntity.ok(
                instanceService.getStatus(TenantContext.getRequiredTenantUUID(), instanceName));
    }
}
