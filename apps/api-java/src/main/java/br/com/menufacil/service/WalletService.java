package br.com.menufacil.service;

import br.com.menufacil.converter.WalletConverter;
import br.com.menufacil.domain.models.Wallet;
import br.com.menufacil.domain.models.WalletTransaction;
import br.com.menufacil.dto.WalletResponse;
import br.com.menufacil.dto.WalletTransactionResponse;
import br.com.menufacil.repository.WalletRepository;
import br.com.menufacil.repository.WalletTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;
    private final WalletConverter walletConverter;

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
        wallet.setBalance(wallet.getBalance().add(amount));
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

        wallet.setBalance(wallet.getBalance().subtract(amount));
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
        return walletConverter.toResponse(wallet);
    }
}
