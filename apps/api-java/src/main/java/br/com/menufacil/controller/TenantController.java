package br.com.menufacil.controller;

import br.com.menufacil.dto.TenantPublicResponse;
import br.com.menufacil.service.TenantService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Tenant", description = "Dados públicos do estabelecimento")
@RestController
@RequestMapping("/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;

    @Operation(summary = "Buscar tenant por slug (público)")
    @GetMapping("/slug/{slug}")
    public ResponseEntity<TenantPublicResponse> findBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(tenantService.findBySlug(slug));
    }
}
