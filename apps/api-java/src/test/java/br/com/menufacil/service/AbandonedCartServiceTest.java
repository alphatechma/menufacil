package br.com.menufacil.service;

import br.com.menufacil.converter.AbandonedCartConverter;
import br.com.menufacil.domain.models.AbandonedCart;
import br.com.menufacil.dto.AbandonedCartResponse;
import br.com.menufacil.dto.AbandonedCartStatsResponse;
import br.com.menufacil.dto.SaveAbandonedCartRequest;
import br.com.menufacil.repository.AbandonedCartRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AbandonedCartServiceTest {

    @Mock private AbandonedCartRepository abandonedCartRepository;
    @Mock private AbandonedCartConverter abandonedCartConverter;

    @InjectMocks
    private AbandonedCartService abandonedCartService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldCriarNovoCarrinhoQuandoNaoExisteAtivo() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        SaveAbandonedCartRequest request = new SaveAbandonedCartRequest();
        request.setCustomerId(customerId);
        request.setItems("[{\"productId\":\"1\"}]");
        request.setTotal(new BigDecimal("50.00"));

        AbandonedCart entity = new AbandonedCart();
        AbandonedCart saved = new AbandonedCart();
        saved.setId(UUID.randomUUID());
        AbandonedCartResponse response = AbandonedCartResponse.builder()
                .id(saved.getId().toString())
                .build();

        when(abandonedCartRepository
                .findFirstByTenantIdAndCustomerIdAndRecoveredFalseOrderByCreatedAtDesc(tenantId, customerId))
                .thenReturn(Optional.empty());
        when(abandonedCartConverter.toEntity(request)).thenReturn(entity);
        when(abandonedCartRepository.save(entity)).thenReturn(saved);
        when(abandonedCartConverter.toResponse(saved)).thenReturn(response);

        // Act
        AbandonedCartResponse result = abandonedCartService.saveCart(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(entity.getTenantId()).isEqualTo(tenantId);
        assertThat(entity.isRecovered()).isFalse();
        verify(abandonedCartRepository).save(entity);
    }

    @Test
    void shouldAtualizarCarrinhoExistenteQuandoEncontrado() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        SaveAbandonedCartRequest request = new SaveAbandonedCartRequest();
        request.setCustomerId(customerId);
        request.setItems("[{\"productId\":\"novo\"}]");
        request.setTotal(new BigDecimal("120.00"));

        AbandonedCart existing = new AbandonedCart();
        existing.setId(UUID.randomUUID());
        existing.setTenantId(tenantId);
        existing.setCustomerId(customerId);
        existing.setItems("[{\"productId\":\"antigo\"}]");
        existing.setTotal(new BigDecimal("50.00"));

        AbandonedCartResponse response = AbandonedCartResponse.builder().build();

        when(abandonedCartRepository
                .findFirstByTenantIdAndCustomerIdAndRecoveredFalseOrderByCreatedAtDesc(tenantId, customerId))
                .thenReturn(Optional.of(existing));
        when(abandonedCartRepository.save(existing)).thenReturn(existing);
        when(abandonedCartConverter.toResponse(existing)).thenReturn(response);

        // Act
        AbandonedCartResponse result = abandonedCartService.saveCart(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(existing.getItems()).isEqualTo("[{\"productId\":\"novo\"}]");
        assertThat(existing.getTotal()).isEqualByComparingTo(new BigDecimal("120.00"));
        verify(abandonedCartRepository).save(existing);
    }

    @Test
    void shouldRetornarCarrinhoRecuperavelQuandoExiste() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();
        AbandonedCart entity = new AbandonedCart();
        AbandonedCartResponse response = AbandonedCartResponse.builder().build();

        when(abandonedCartRepository
                .findFirstByTenantIdAndCustomerIdAndRecoveredFalseOrderByCreatedAtDesc(tenantId, customerId))
                .thenReturn(Optional.of(entity));
        when(abandonedCartConverter.toResponse(entity)).thenReturn(response);

        // Act
        Optional<AbandonedCartResponse> result = abandonedCartService.getRecoverableCart(tenantId, customerId);

        // Assert
        assertThat(result).isPresent();
    }

    @Test
    void shouldRetornarVazioQuandoNaoHaCarrinhoRecuperavel() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID customerId = UUID.randomUUID();

        when(abandonedCartRepository
                .findFirstByTenantIdAndCustomerIdAndRecoveredFalseOrderByCreatedAtDesc(tenantId, customerId))
                .thenReturn(Optional.empty());

        // Act
        Optional<AbandonedCartResponse> result = abandonedCartService.getRecoverableCart(tenantId, customerId);

        // Assert
        assertThat(result).isEmpty();
    }

    @Test
    void shouldListarCarrinhosAbandonadosPaginados() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        AbandonedCart entity = new AbandonedCart();
        Page<AbandonedCart> page = new PageImpl<>(List.of(entity));

        when(abandonedCartRepository.findByTenantIdOrderByCreatedAtDesc(eq(tenantId), any(Pageable.class)))
                .thenReturn(page);
        when(abandonedCartConverter.toResponse(any())).thenReturn(AbandonedCartResponse.builder().build());

        // Act
        Page<AbandonedCartResponse> result = abandonedCartService.findAll(tenantId, 0, 20);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    void shouldCalcularEstatisticasComRecuperacao() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        AbandonedCart c1 = new AbandonedCart();
        c1.setTotal(new BigDecimal("100.00"));
        AbandonedCart c2 = new AbandonedCart();
        c2.setTotal(new BigDecimal("50.50"));

        when(abandonedCartRepository.countByTenantId(tenantId)).thenReturn(10L);
        when(abandonedCartRepository.countByTenantIdAndRecoveredTrue(tenantId)).thenReturn(4L);
        when(abandonedCartRepository.findByTenantIdAndRecoveredFalse(tenantId))
                .thenReturn(List.of(c1, c2));

        // Act
        AbandonedCartStatsResponse stats = abandonedCartService.getStats(tenantId);

        // Assert
        assertThat(stats.getTotal()).isEqualTo(10L);
        assertThat(stats.getTotalRecovered()).isEqualTo(4L);
        assertThat(stats.getRecoveryRate()).isEqualTo(40.0);
        assertThat(stats.getLostRevenue()).isEqualByComparingTo(new BigDecimal("150.50"));
    }

    @Test
    void shouldRetornarEstatisticasZeradasQuandoNaoHaCarrinhos() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        when(abandonedCartRepository.countByTenantId(tenantId)).thenReturn(0L);
        when(abandonedCartRepository.countByTenantIdAndRecoveredTrue(tenantId)).thenReturn(0L);
        when(abandonedCartRepository.findByTenantIdAndRecoveredFalse(tenantId)).thenReturn(List.of());

        // Act
        AbandonedCartStatsResponse stats = abandonedCartService.getStats(tenantId);

        // Assert
        assertThat(stats.getTotal()).isZero();
        assertThat(stats.getTotalRecovered()).isZero();
        assertThat(stats.getRecoveryRate()).isEqualTo(0.0);
        assertThat(stats.getLostRevenue()).isEqualByComparingTo(BigDecimal.ZERO);
    }
}
