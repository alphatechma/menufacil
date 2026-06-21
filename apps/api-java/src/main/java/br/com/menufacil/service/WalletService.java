package br.com.menufacil.service;

import br.com.menufacil.converter.WalletConverter;
import br.com.menufacil.domain.models.Wallet;
import br.com.menufacil.domain.models.WalletTransaction;
import br.com.menufacil.dto.WalletResponse;
import br.com.menufacil.dto.WalletTransactionResponse;
import br.com.menufacil.repository.WalletRepository;
import br.com.menufacil.repository.WalletTransactionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;
    private final WalletConverter walletConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public Wallet getOrCreateWallet(UUID customerId, UUID tenantId) {
        return walletRepository.findByCustomerIdAndTenantId(customerId, tenantId)
                .orElseGet(() -> {
                    Wallet wallet = new Wallet();
                    wallet.setCustomerId(customerId);
                    wallet.setTenantId(tenantId);
                    wallet.setBalance(BigDecimal.ZERO);
                    return walletRepository.save(wallet);
                });
    }

    public WalletResponse getBalance(UUID customerId, UUID tenantId) {
        Wallet wallet = getOrCreateWallet(customerId, tenantId);
        return walletConverter.toResponse(wallet);
    }

    public List<WalletTransactionResponse> getTransactions(UUID customerId, UUID tenantId) {
        Wallet wallet = getOrCreateWallet(customerId, tenantId);
        return transactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId()).stream()
                .map(walletConverter::toTransactionResponse)
                .toList();
    }

    @Transactional
    public WalletResponse addCredit(UUID customerId, UUID tenantId, BigDecimal amount, String description) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valor deve ser maior que zero");
        }

        Wallet wallet = getOrCreateWallet(customerId, tenantId);
        BigDecimal balanceBefore = wallet.getBalance();
        wallet.setBalance(balanceBefore.add(amount));
        walletRepository.save(wallet);

        WalletTransaction transaction = new WalletTransaction();
        transaction.setWalletId(wallet.getId());
        transaction.setTenantId(tenantId);
        transaction.setType("credit");
        transaction.setAmount(amount);
        transaction.setDescription(description);
        transactionRepository.save(transaction);

        log.info("Crédito de {} adicionado à carteira do cliente {} no tenant {}",
                amount, customerId, tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("customerId", customerId.toString());
            details.put("amount", amount.toPlainString());
            details.put("reason", description);
            details.put("balanceBefore", balanceBefore.toPlainString());
            details.put("balanceAfter", wallet.getBalance().toPlainString());
            auditLogService.log(
                    wallet.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "credit",
                    "wallet",
                    wallet.getId(),
                    null,
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de crédito de carteira: {}", e.getMessage());
        }

        return walletConverter.toResponse(wallet);
    }

    @Transactional
    public WalletResponse debit(UUID customerId, UUID tenantId, BigDecimal amount, String description, UUID orderId) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valor deve ser maior que zero");
        }

        Wallet wallet = getOrCreateWallet(customerId, tenantId);

        if (wallet.getBalance().compareTo(amount) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Saldo insuficiente");
        }

        BigDecimal balanceBefore = wallet.getBalance();
        wallet.setBalance(balanceBefore.subtract(amount));
        walletRepository.save(wallet);

        WalletTransaction transaction = new WalletTransaction();
        transaction.setWalletId(wallet.getId());
        transaction.setTenantId(tenantId);
        transaction.setType("debit");
        transaction.setAmount(amount);
        transaction.setDescription(description);
        transaction.setOrderId(orderId);
        transactionRepository.save(transaction);

        log.info("Débito de {} na carteira do cliente {} no tenant {}",
                amount, customerId, tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("customerId", customerId.toString());
            details.put("amount", amount.toPlainString());
            details.put("reason", description);
            details.put("balanceBefore", balanceBefore.toPlainString());
            details.put("balanceAfter", wallet.getBalance().toPlainString());
            details.put("orderId", orderId != null ? orderId.toString() : null);
            auditLogService.log(
                    wallet.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "debit",
                    "wallet",
                    wallet.getId(),
                    null,
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de débito de carteira: {}", e.getMessage());
        }

        return walletConverter.toResponse(wallet);
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object details = auth.getDetails();
        if (details instanceof Claims claims) {
            String userId = claims.get("userId", String.class);
            if (userId != null && !userId.isBlank()) {
                try { return UUID.fromString(userId); } catch (IllegalArgumentException ignored) {}
            }
        }
        return null;
    }

    private String getCurrentIpAddress() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String forwarded = req.getHeader("X-Forwarded-For");
                if (forwarded != null && !forwarded.isBlank()) {
                    return forwarded.split(",")[0].trim();
                }
                return req.getRemoteAddr();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String serializeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception e) {
            return details.toString();
        }
    }
}
