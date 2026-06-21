package br.com.menufacil.service;

import br.com.menufacil.converter.ReviewConverter;
import br.com.menufacil.domain.models.Review;
import br.com.menufacil.dto.CreateReviewRequest;
import br.com.menufacil.dto.ReviewResponse;
import br.com.menufacil.dto.ReviewStatsResponse;
import br.com.menufacil.repository.ReviewRepository;
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

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ReviewConverter reviewConverter;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<ReviewResponse> findAllByTenant(UUID tenantId) {
        return reviewRepository.findByTenantIdOrderByCreatedAtDesc(tenantId).stream()
                .map(reviewConverter::toResponse)
                .toList();
    }

    public ReviewResponse findById(UUID id, UUID tenantId) {
        Review entity = reviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Avaliação não encontrada"));
        validateTenant(entity, tenantId);
        return reviewConverter.toResponse(entity);
    }

    @Transactional
    public ReviewResponse create(UUID tenantId, CreateReviewRequest request) {
        UUID orderId = UUID.fromString(request.getOrderId());

        // Validar que não existe review para este pedido
        reviewRepository.findByOrderIdAndTenantId(orderId, tenantId)
                .ifPresent(r -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Já existe uma avaliação para este pedido");
                });

        Review entity = reviewConverter.toEntity(request);
        entity.setTenantId(tenantId);
        entity = reviewRepository.save(entity);
        log.info("Avaliação criada para pedido {} no tenant {}", orderId, tenantId);
        return reviewConverter.toResponse(entity);
    }

    @Transactional
    public ReviewResponse reply(UUID id, UUID tenantId, String replyText) {
        Review entity = reviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Avaliação não encontrada"));
        validateTenant(entity, tenantId);

        entity.setReply(replyText);
        entity.setRepliedAt(LocalDateTime.now());
        entity = reviewRepository.save(entity);
        log.info("Resposta adicionada à avaliação {} no tenant {}", id, tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("reviewId", entity.getId().toString());
            details.put("repliedAt", entity.getRepliedAt() != null ? entity.getRepliedAt().toString() : null);
            details.put("replyLength", replyText != null ? replyText.length() : 0);
            auditLogService.log(
                    entity.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "reply",
                    "review",
                    entity.getId(),
                    null,
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de resposta de avaliação: {}", e.getMessage());
        }

        return reviewConverter.toResponse(entity);
    }

    public ReviewStatsResponse getStats(UUID tenantId) {
        Double avgRating = reviewRepository.findAverageRatingByTenantId(tenantId);
        long totalReviews = reviewRepository.countByTenantId(tenantId);
        List<Object[]> countByRating = reviewRepository.countByRatingAndTenantId(tenantId);

        Map<Integer, Long> countByStar = new HashMap<>();
        for (int i = 1; i <= 5; i++) {
            countByStar.put(i, 0L);
        }
        for (Object[] row : countByRating) {
            Integer star = (Integer) row[0];
            Long count = (Long) row[1];
            countByStar.put(star, count);
        }

        return ReviewStatsResponse.builder()
                .averageRating(avgRating != null ? avgRating : 0.0)
                .totalReviews(totalReviews)
                .countByStar(countByStar)
                .build();
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Review entity = reviewRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Avaliação não encontrada"));
        validateTenant(entity, tenantId);

        UUID reviewId = entity.getId();
        UUID reviewTenantId = entity.getTenantId();

        reviewRepository.delete(entity);
        log.info("Avaliação removida: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    reviewTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "review",
                    reviewId,
                    null,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de remoção de avaliação: {}", e.getMessage());
        }
    }

    private void validateTenant(Review entity, UUID tenantId) {
        if (!entity.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
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
