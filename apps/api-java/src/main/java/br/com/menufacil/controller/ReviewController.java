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
        return ResponseEntity.ok(reviewService.findAllByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar avaliação por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ReviewResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(reviewService.findById(id, TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Criar avaliação")
    @PostMapping
    public ResponseEntity<ReviewResponse> create(
            @Valid @RequestBody CreateReviewRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reviewService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Responder avaliação")
    @PutMapping("/{id}/reply")
    public ResponseEntity<ReviewResponse> reply(
            @PathVariable UUID id,
            @Valid @RequestBody ReplyReviewRequest request) {
        return ResponseEntity.ok(reviewService.reply(id, TenantContext.getRequiredTenantUUID(), request.getReply()));
    }

    @Operation(summary = "Estatísticas de avaliações")
    @GetMapping("/stats")
    public ResponseEntity<ReviewStatsResponse> getStats() {
        return ResponseEntity.ok(reviewService.getStats(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Remover avaliação")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        reviewService.delete(id, TenantContext.getRequiredTenantUUID());
        return ResponseEntity.noContent().build();
    }
}
