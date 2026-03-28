package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.*;
import br.com.menufacil.service.ReviewService;
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

@Tag(name = "Avaliações", description = "Gerenciamento de avaliações")
@RestController
@RequestMapping("/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @Operation(summary = "Listar todas as avaliações do tenant")
    @GetMapping
    public ResponseEntity<List<ReviewResponse>> listAll() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(reviewService.findAllByTenant(tenantId));
    }

    @Operation(summary = "Buscar avaliação por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ReviewResponse> findById(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(reviewService.findById(id, tenantId));
    }

    @Operation(summary = "Criar avaliação")
    @PostMapping
    public ResponseEntity<ReviewResponse> create(
            @Valid @RequestBody CreateReviewRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.create(tenantId, request));
    }

    @Operation(summary = "Responder avaliação")
    @PutMapping("/{id}/reply")
    public ResponseEntity<ReviewResponse> reply(
            @PathVariable UUID id,
            @Valid @RequestBody ReplyReviewRequest request) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(reviewService.reply(id, tenantId, request.getReply()));
    }

    @Operation(summary = "Estatísticas de avaliações")
    @GetMapping("/stats")
    public ResponseEntity<ReviewStatsResponse> getStats() {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        return ResponseEntity.ok(reviewService.getStats(tenantId));
    }

    @Operation(summary = "Remover avaliação")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();
        reviewService.delete(id, tenantId);
        return ResponseEntity.noContent().build();
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
