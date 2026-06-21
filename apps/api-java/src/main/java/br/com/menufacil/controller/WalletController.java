package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.config.security.SecurityContextHelper;
import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.WalletCreditRequest;
import br.com.menufacil.dto.WalletResponse;
import br.com.menufacil.dto.WalletTransactionResponse;
import br.com.menufacil.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Slf4j
@Tag(name = "Carteira", description = "Gerenciamento de carteira digital")
@RestController
@RequestMapping("/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @Operation(summary = "Consultar saldo do cliente (admin)")
    @RequirePermissions("loyalty:read")
    @GetMapping("/balance")
    public ResponseEntity<WalletResponse> getBalance(@RequestParam UUID customerId) {
        return ResponseEntity.ok(walletService.getBalance(customerId, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Listar transações do cliente (admin)")
    @RequirePermissions("loyalty:read")
    @GetMapping("/transactions")
    public ResponseEntity<List<WalletTransactionResponse>> getTransactions(
            @RequestParam UUID customerId) {
        return ResponseEntity.ok(walletService.getTransactions(customerId, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Adicionar crédito à carteira (admin)")
    @RequirePermissions("loyalty:update")
    @PostMapping("/admin/credit")
    public ResponseEntity<WalletResponse> addCredit(
            @Valid @RequestBody WalletCreditRequest request) {
        UUID customerId = UUID.fromString(request.getCustomerId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(walletService.addCredit(customerId, TenantContext.getRequiredTenantUUID(),
                        request.getAmount(), request.getDescription()));
    }

    @Operation(summary = "Consultar saldo da minha carteira (cliente)")
    @GetMapping("/my-balance")
    public ResponseEntity<WalletResponse> getMyBalance(
            @RequestHeader(value = "X-Customer-Id", required = false) String customerIdHeader) {
        UUID customerId = getCurrentCustomerId(customerIdHeader);
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(walletService.getBalance(customerId, tenantId));
    }

    @Operation(summary = "Listar minhas transações da carteira (cliente)")
    @GetMapping("/my-transactions")
    public ResponseEntity<List<WalletTransactionResponse>> getMyTransactions(
            @RequestHeader(value = "X-Customer-Id", required = false) String customerIdHeader) {
        UUID customerId = getCurrentCustomerId(customerIdHeader);
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(walletService.getTransactions(customerId, tenantId));
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
