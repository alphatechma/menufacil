package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.config.security.SecurityContextHelper;
import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.ApplyReferralRequest;
import br.com.menufacil.dto.ApplyReferralResponse;
import br.com.menufacil.dto.ReferralCodeResponse;
import br.com.menufacil.dto.ReferralResponse;
import br.com.menufacil.dto.ReferralStatsResponse;
import br.com.menufacil.service.ReferralService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Tag(name = "Indicações", description = "Programa de indicação de clientes (referral)")
@RestController
@RequestMapping("/referrals")
@RequiredArgsConstructor
public class ReferralController {

    private final ReferralService referralService;

    @Operation(summary = "Obter meu código de indicação (cliente)")
    @GetMapping("/my-code")
    public ResponseEntity<ReferralCodeResponse> getMyCode(
            @RequestHeader(value = "X-Customer-Id", required = false) String customerIdHeader) {
        UUID customerId = getCurrentCustomerId(customerIdHeader);
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(referralService.getMyCode(customerId, tenantId));
    }

    @Operation(summary = "Listar minhas indicações (cliente)")
    @GetMapping("/my-referrals")
    public ResponseEntity<List<ReferralResponse>> getMyReferrals(
            @RequestHeader(value = "X-Customer-Id", required = false) String customerIdHeader) {
        UUID customerId = getCurrentCustomerId(customerIdHeader);
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(referralService.getMyReferrals(customerId, tenantId));
    }

    @Operation(summary = "Aplicar código de indicação (cliente)")
    @PostMapping("/apply")
    public ResponseEntity<ApplyReferralResponse> applyReferral(
            @Valid @RequestBody ApplyReferralRequest request,
            @RequestHeader(value = "X-Customer-Id", required = false) String customerIdHeader) {
        UUID customerId = getCurrentCustomerId(customerIdHeader);
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(referralService.applyReferral(customerId, request.getCode(), tenantId));
    }

    @Operation(summary = "Estatísticas de indicações do tenant (admin)")
    @RequirePermissions("loyalty:read")
    @GetMapping("/stats")
    public ResponseEntity<ReferralStatsResponse> getStats() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(referralService.getStats(tenantId));
    }

    /**
     * Resolve o customerId logado.
     *
     * Estrategia:
     *   1. Tenta extrair do JWT atual via {@link SecurityContextHelper#getCurrentCustomerId()}.
     *   2. Fallback: aceita o header {@code X-Customer-Id} para backwards-compat
     *      enquanto o frontend / clientes externos migram para o novo JWT.
     *
     * TODO: remover o fallback de header assim que todos os consumidores estiverem
     * emitindo o JWT de customer com o claim {@code customerId} (deadline alvo: proximo release).
     */
    private UUID getCurrentCustomerId(String customerIdHeader) {
        return SecurityContextHelper.getCurrentCustomerId()
                .orElseGet(() -> parseHeaderFallback(customerIdHeader));
    }

    private UUID parseHeaderFallback(String customerIdHeader) {
        if (customerIdHeader == null || customerIdHeader.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Cliente não autenticado (JWT sem customerId e header X-Customer-Id ausente)");
        }
        try {
            return UUID.fromString(customerIdHeader.trim());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "X-Customer-Id inválido");
        }
    }
}
