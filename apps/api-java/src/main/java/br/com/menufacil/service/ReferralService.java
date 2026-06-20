package br.com.menufacil.service;

import br.com.menufacil.converter.ReferralConverter;
import br.com.menufacil.domain.models.Referral;
import br.com.menufacil.dto.ApplyReferralResponse;
import br.com.menufacil.dto.ReferralCodeResponse;
import br.com.menufacil.dto.ReferralResponse;
import br.com.menufacil.dto.ReferralStatsResponse;
import br.com.menufacil.repository.ReferralRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReferralService {

    private static final String CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 8;
    private static final int DEFAULT_REFERRAL_POINTS = 10;
    private static final int MAX_CODE_GENERATION_ATTEMPTS = 10;

    private final ReferralRepository referralRepository;
    private final ReferralConverter referralConverter;
    private final LoyaltyService loyaltyService;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Retorna o código de indicação (template) do cliente logado.
     * Se ainda não existir, gera um novo código e persiste como template.
     */
    @Transactional
    public ReferralCodeResponse getMyCode(UUID customerId, UUID tenantId) {
        Referral template = referralRepository
                .findByReferrerIdAndTenantIdAndReferredIdIsNull(customerId, tenantId)
                .orElse(null);

        if (template != null) {
            return ReferralCodeResponse.builder().code(template.getCode()).build();
        }

        Referral newTemplate = new Referral();
        newTemplate.setTenantId(tenantId);
        newTemplate.setReferrerId(customerId);
        newTemplate.setCode(generateUniqueCode());
        newTemplate.setRewardGiven(false);
        newTemplate.setPointsAwarded(0);

        newTemplate = referralRepository.save(newTemplate);
        log.info("Código de indicação criado: {} para cliente {} no tenant {}",
                newTemplate.getCode(), customerId, tenantId);

        return ReferralCodeResponse.builder().code(newTemplate.getCode()).build();
    }

    /**
     * Lista todas as indicações realizadas pelo cliente logado
     * (templates e indicações concretas).
     */
    public List<ReferralResponse> getMyReferrals(UUID customerId, UUID tenantId) {
        return referralRepository.findByReferrerIdAndTenantIdOrderByCreatedAtDesc(customerId, tenantId)
                .stream()
                .map(referralConverter::toResponse)
                .toList();
    }

    /**
     * Aplica um código de indicação para o cliente logado.
     * Cria um Referral concreto vinculando referrer (dono do código) e referred (cliente logado),
     * e concede pontos ao referrer via LoyaltyService.
     */
    @Transactional
    public ApplyReferralResponse applyReferral(UUID referredCustomerId, String code, UUID tenantId) {
        if (code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Código de indicação é obrigatório");
        }

        Referral template = referralRepository.findByCodeAndTenantId(code.trim().toUpperCase(), tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Código de indicação não encontrado"));

        if (template.getReferrerId().equals(referredCustomerId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Você não pode usar seu próprio código de indicação");
        }

        referralRepository.findByReferredIdAndTenantId(referredCustomerId, tenantId)
                .ifPresent(r -> {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Você já foi indicado por alguém");
                });

        Referral newReferral = new Referral();
        newReferral.setTenantId(tenantId);
        newReferral.setReferrerId(template.getReferrerId());
        newReferral.setReferredId(referredCustomerId);
        newReferral.setCode(generateUniqueCode());
        newReferral.setRewardGiven(true);
        newReferral.setPointsAwarded(DEFAULT_REFERRAL_POINTS);

        referralRepository.save(newReferral);

        // Concede pontos ao referrer através do LoyaltyService (assinatura: addPoints(customerId, points, tenantId))
        try {
            loyaltyService.addPoints(template.getReferrerId(), DEFAULT_REFERRAL_POINTS, tenantId);
        } catch (ResponseStatusException ex) {
            log.warn("Falha ao conceder pontos ao referrer {} no tenant {}: {}",
                    template.getReferrerId(), tenantId, ex.getReason());
        }

        log.info("Indicação aplicada: referrer={} referred={} pontos={} tenant={}",
                template.getReferrerId(), referredCustomerId, DEFAULT_REFERRAL_POINTS, tenantId);

        return ApplyReferralResponse.builder()
                .success(true)
                .message("Código de indicação aplicado com sucesso!")
                .build();
    }

    /**
     * Estatísticas de indicações do tenant (admin).
     */
    public ReferralStatsResponse getStats(UUID tenantId) {
        long totalReferrals = referralRepository.countByTenantIdAndReferredIdIsNotNull(tenantId);
        long successful = referralRepository
                .countByTenantIdAndReferredIdIsNotNullAndRewardGivenTrue(tenantId);
        long totalPoints = referralRepository.sumPointsAwardedByTenant(tenantId);

        double conversionRate = totalReferrals > 0
                ? Math.round(((double) successful / totalReferrals) * 1000.0) / 10.0
                : 0.0;

        List<ReferralStatsResponse.TopReferrer> topReferrers = referralRepository.findTopReferrers(tenantId)
                .stream()
                .limit(10)
                .toList();

        return ReferralStatsResponse.builder()
                .totalReferrals(totalReferrals)
                .successfulReferrals(successful)
                .conversionRate(conversionRate)
                .totalPointsAwarded(totalPoints)
                .topReferrers(topReferrers)
                .build();
    }

    /**
     * Gera um código aleatório de 8 caracteres alfanuméricos (uppercase)
     * usando SecureRandom, garantindo unicidade no banco.
     */
    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
            String candidate = generateRandomCode();
            if (!referralRepository.existsByCode(candidate)) {
                return candidate;
            }
        }
        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                "Não foi possível gerar um código de indicação único");
    }

    private String generateRandomCode() {
        StringBuilder sb = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            sb.append(CODE_ALPHABET.charAt(secureRandom.nextInt(CODE_ALPHABET.length())));
        }
        return sb.toString();
    }
}
