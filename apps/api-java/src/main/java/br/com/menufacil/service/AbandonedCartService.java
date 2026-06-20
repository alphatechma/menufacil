package br.com.menufacil.service;

import br.com.menufacil.converter.AbandonedCartConverter;
import br.com.menufacil.domain.models.AbandonedCart;
import br.com.menufacil.dto.AbandonedCartResponse;
import br.com.menufacil.dto.AbandonedCartStatsResponse;
import br.com.menufacil.dto.SaveAbandonedCartRequest;
import br.com.menufacil.repository.AbandonedCartRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AbandonedCartService {

    private final AbandonedCartRepository abandonedCartRepository;
    private final AbandonedCartConverter abandonedCartConverter;

    /**
     * Salva (upsert) o carrinho do cliente.
     * Se existe carrinho não-recuperado para o mesmo customer+tenant, atualiza items/total.
     * Senão cria um novo carrinho.
     */
    @Transactional
    public AbandonedCartResponse saveCart(UUID tenantId, SaveAbandonedCartRequest request) {
        Optional<AbandonedCart> existing = abandonedCartRepository
                .findFirstByTenantIdAndCustomerIdAndRecoveredFalseOrderByCreatedAtDesc(
                        tenantId, request.getCustomerId());

        AbandonedCart cart;
        if (existing.isPresent()) {
            cart = existing.get();
            cart.setItems(request.getItems());
            cart.setTotal(request.getTotal());
            log.info("Carrinho abandonado atualizado para cliente {} no tenant {}",
                    request.getCustomerId(), tenantId);
        } else {
            cart = abandonedCartConverter.toEntity(request);
            cart.setTenantId(tenantId);
            cart.setRecovered(false);
            cart.setNotificationSent(false);
            log.info("Novo carrinho abandonado criado para cliente {} no tenant {}",
                    request.getCustomerId(), tenantId);
        }

        cart = abandonedCartRepository.save(cart);
        return abandonedCartConverter.toResponse(cart);
    }

    /**
     * Recupera o último carrinho não-recuperado do cliente.
     */
    public Optional<AbandonedCartResponse> getRecoverableCart(UUID tenantId, UUID customerId) {
        return abandonedCartRepository
                .findFirstByTenantIdAndCustomerIdAndRecoveredFalseOrderByCreatedAtDesc(tenantId, customerId)
                .map(abandonedCartConverter::toResponse);
    }

    /**
     * Lista paginada de carrinhos abandonados do tenant (admin).
     */
    public Page<AbandonedCartResponse> findAll(UUID tenantId, int page, int limit) {
        Pageable pageable = PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        return abandonedCartRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable)
                .map(abandonedCartConverter::toResponse);
    }

    /**
     * Estatísticas de recuperação de carrinhos abandonados.
     */
    public AbandonedCartStatsResponse getStats(UUID tenantId) {
        long total = abandonedCartRepository.countByTenantId(tenantId);
        long totalRecovered = abandonedCartRepository.countByTenantIdAndRecoveredTrue(tenantId);

        double recoveryRate = total > 0
                ? Math.round(((double) totalRecovered / total) * 10000.0) / 100.0
                : 0.0;

        List<AbandonedCart> nonRecovered = abandonedCartRepository
                .findByTenantIdAndRecoveredFalse(tenantId);
        BigDecimal lostRevenue = nonRecovered.stream()
                .map(AbandonedCart::getTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return AbandonedCartStatsResponse.builder()
                .total(total)
                .totalRecovered(totalRecovered)
                .recoveryRate(recoveryRate)
                .lostRevenue(lostRevenue)
                .build();
    }

    @SuppressWarnings("unused")
    private void validateTenant(AbandonedCart cart, UUID tenantId) {
        if (!cart.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
