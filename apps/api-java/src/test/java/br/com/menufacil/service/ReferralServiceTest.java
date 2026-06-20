package br.com.menufacil.service;

import br.com.menufacil.converter.ReferralConverter;
import br.com.menufacil.domain.models.Referral;
import br.com.menufacil.dto.ApplyReferralResponse;
import br.com.menufacil.dto.ReferralCodeResponse;
import br.com.menufacil.dto.ReferralResponse;
import br.com.menufacil.dto.ReferralStatsResponse;
import br.com.menufacil.repository.ReferralRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReferralServiceTest {

    @Mock private ReferralRepository referralRepository;
    @Mock private ReferralConverter referralConverter;
    @Mock private LoyaltyService loyaltyService;

    @InjectMocks
    private ReferralService referralService;

    private UUID tenantId;
    private UUID customerId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
        customerId = UUID.randomUUID();
    }

    @Test
    void shouldRetornarCodigoExistenteQuandoTemplateJaExiste() {
        // Arrange
        Referral existing = new Referral();
        existing.setId(UUID.randomUUID());
        existing.setReferrerId(customerId);
        existing.setTenantId(tenantId);
        existing.setCode("EXISTING1");

        when(referralRepository.findByReferrerIdAndTenantIdAndReferredIdIsNull(customerId, tenantId))
                .thenReturn(Optional.of(existing));

        // Act
        ReferralCodeResponse result = referralService.getMyCode(customerId, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getCode()).isEqualTo("EXISTING1");
        verify(referralRepository, never()).save(any());
    }

    @Test
    void shouldGerarNovoCodigoQuandoTemplateNaoExiste() {
        // Arrange
        when(referralRepository.findByReferrerIdAndTenantIdAndReferredIdIsNull(customerId, tenantId))
                .thenReturn(Optional.empty());
        when(referralRepository.existsByCode(anyString())).thenReturn(false);

        when(referralRepository.save(any(Referral.class))).thenAnswer(invocation -> {
            Referral toSave = invocation.getArgument(0);
            toSave.setId(UUID.randomUUID());
            return toSave;
        });

        // Act
        ReferralCodeResponse result = referralService.getMyCode(customerId, tenantId);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getCode()).isNotNull();
        assertThat(result.getCode()).hasSize(8);
        assertThat(result.getCode()).matches("[A-Z0-9]{8}");

        ArgumentCaptor<Referral> captor = ArgumentCaptor.forClass(Referral.class);
        verify(referralRepository).save(captor.capture());
        Referral saved = captor.getValue();
        assertThat(saved.getReferrerId()).isEqualTo(customerId);
        assertThat(saved.getTenantId()).isEqualTo(tenantId);
        assertThat(saved.getReferredId()).isNull();
        assertThat(saved.isRewardGiven()).isFalse();
        assertThat(saved.getPointsAwarded()).isZero();
    }

    @Test
    void shouldListarMinhasIndicacoes() {
        // Arrange
        Referral r1 = new Referral();
        Referral r2 = new Referral();
        when(referralRepository.findByReferrerIdAndTenantIdOrderByCreatedAtDesc(customerId, tenantId))
                .thenReturn(List.of(r1, r2));
        when(referralConverter.toResponse(any(Referral.class)))
                .thenReturn(ReferralResponse.builder().build());

        // Act
        List<ReferralResponse> result = referralService.getMyReferrals(customerId, tenantId);

        // Assert
        assertThat(result).hasSize(2);
        verify(referralConverter, times(2)).toResponse(any(Referral.class));
    }

    @Test
    void shouldAplicarCodigoEConceder10Pontos() {
        // Arrange
        UUID referrerId = UUID.randomUUID();
        Referral template = new Referral();
        template.setId(UUID.randomUUID());
        template.setReferrerId(referrerId);
        template.setTenantId(tenantId);
        template.setCode("VALIDCDE");

        when(referralRepository.findByCodeAndTenantId("VALIDCDE", tenantId))
                .thenReturn(Optional.of(template));
        when(referralRepository.findByReferredIdAndTenantId(customerId, tenantId))
                .thenReturn(Optional.empty());
        when(referralRepository.existsByCode(anyString())).thenReturn(false);
        when(referralRepository.save(any(Referral.class))).thenAnswer(i -> i.getArgument(0));

        // Act
        ApplyReferralResponse response = referralService.applyReferral(customerId, "validcde", tenantId);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.isSuccess()).isTrue();
        assertThat(response.getMessage()).isEqualTo("Código de indicação aplicado com sucesso!");

        ArgumentCaptor<Referral> captor = ArgumentCaptor.forClass(Referral.class);
        verify(referralRepository).save(captor.capture());
        Referral saved = captor.getValue();
        assertThat(saved.getReferrerId()).isEqualTo(referrerId);
        assertThat(saved.getReferredId()).isEqualTo(customerId);
        assertThat(saved.isRewardGiven()).isTrue();
        assertThat(saved.getPointsAwarded()).isEqualTo(10);

        verify(loyaltyService).addPoints(eq(referrerId), eq(10), eq(tenantId));
    }

    @Test
    void shouldRejeitarAplicacaoDeCodigoProprio() {
        // Arrange
        Referral template = new Referral();
        template.setId(UUID.randomUUID());
        template.setReferrerId(customerId);
        template.setTenantId(tenantId);
        template.setCode("OWNCODE1");

        when(referralRepository.findByCodeAndTenantId("OWNCODE1", tenantId))
                .thenReturn(Optional.of(template));

        // Act + Assert
        assertThatThrownBy(() -> referralService.applyReferral(customerId, "OWNCODE1", tenantId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("seu próprio código");

        verify(referralRepository, never()).save(any());
        verify(loyaltyService, never()).addPoints(any(), anyInt(), any());
    }

    @Test
    void shouldLancarExcecaoAoAplicarCodigoInexistente() {
        // Arrange
        when(referralRepository.findByCodeAndTenantId("NOTFOUND1", tenantId))
                .thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> referralService.applyReferral(customerId, "NOTFOUND1", tenantId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Código de indicação não encontrado");

        verify(loyaltyService, never()).addPoints(any(), anyInt(), any());
    }

    @Test
    void shouldRejeitarAplicacaoQuandoClienteJaFoiIndicado() {
        // Arrange
        UUID referrerId = UUID.randomUUID();
        Referral template = new Referral();
        template.setReferrerId(referrerId);
        template.setTenantId(tenantId);
        template.setCode("VALIDCDE");

        Referral existingApplied = new Referral();
        existingApplied.setReferredId(customerId);
        existingApplied.setTenantId(tenantId);

        when(referralRepository.findByCodeAndTenantId("VALIDCDE", tenantId))
                .thenReturn(Optional.of(template));
        when(referralRepository.findByReferredIdAndTenantId(customerId, tenantId))
                .thenReturn(Optional.of(existingApplied));

        // Act + Assert
        assertThatThrownBy(() -> referralService.applyReferral(customerId, "VALIDCDE", tenantId))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("já foi indicado");

        verify(loyaltyService, never()).addPoints(any(), anyInt(), any());
    }

    @Test
    void shouldRetornarEstatisticasDoTenant() {
        // Arrange
        ReferralStatsResponse.TopReferrer top = ReferralStatsResponse.TopReferrer.builder()
                .referrerId(UUID.randomUUID().toString())
                .count(5L)
                .totalPoints(50L)
                .build();

        when(referralRepository.countByTenantIdAndReferredIdIsNotNull(tenantId)).thenReturn(10L);
        when(referralRepository.countByTenantIdAndReferredIdIsNotNullAndRewardGivenTrue(tenantId))
                .thenReturn(7L);
        when(referralRepository.sumPointsAwardedByTenant(tenantId)).thenReturn(70L);
        when(referralRepository.findTopReferrers(tenantId)).thenReturn(List.of(top));

        // Act
        ReferralStatsResponse stats = referralService.getStats(tenantId);

        // Assert
        assertThat(stats).isNotNull();
        assertThat(stats.getTotalReferrals()).isEqualTo(10L);
        assertThat(stats.getSuccessfulReferrals()).isEqualTo(7L);
        assertThat(stats.getConversionRate()).isEqualTo(70.0);
        assertThat(stats.getTotalPointsAwarded()).isEqualTo(70L);
        assertThat(stats.getTopReferrers()).hasSize(1);
        assertThat(stats.getTopReferrers().get(0).getCount()).isEqualTo(5L);
    }
}
