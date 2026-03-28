package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.WalletCreditRequest;
import br.com.menufacil.dto.WalletResponse;
import br.com.menufacil.dto.WalletTransactionResponse;
import br.com.menufacil.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Tag(name = "Carteira", description = "Gerenciamento de carteira digital")
@RestController
@RequestMapping("/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    @Operation(summary = "Consultar saldo do cliente")
    @GetMapping("/balance")
    public ResponseEntity<WalletResponse> getBalance(@RequestParam UUID customerId) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(walletService.getBalance(customerId, tenantId));
    }

    @Operation(summary = "Listar transações do cliente")
    @GetMapping("/transactions")
    public ResponseEntity<List<WalletTransactionResponse>> getTransactions(
            @RequestParam UUID customerId) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(walletService.getTransactions(customerId, tenantId));
    }

    @Operation(summary = "Adicionar crédito à carteira (admin)")
    @PostMapping("/admin/credit")
    public ResponseEntity<WalletResponse> addCredit(
            @Valid @RequestBody WalletCreditRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        UUID customerId = UUID.fromString(request.getCustomerId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(walletService.addCredit(customerId, tenantId,
                        request.getAmount(), request.getDescription()));
    }

    private UUID TenantContext.getRequiredTenantUUID() {
        String tenantIdStr = TenantContext.getCurrentId();
        if (tenantIdStr == null || tenantIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Header X-Tenant-Slug é obrigatório");
        }
        return UUID.fromString(tenantIdStr);
    }
}
