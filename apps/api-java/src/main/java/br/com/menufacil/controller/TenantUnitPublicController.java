package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.TenantUnitResponse;
import br.com.menufacil.service.TenantUnitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Unidades (Público)", description = "Listagem pública de unidades ativas do tenant")
@RestController
@RequestMapping("/public/units")
@RequiredArgsConstructor
public class TenantUnitPublicController {

    private final TenantUnitService tenantUnitService;

    @Operation(summary = "Listar unidades ativas do tenant (público via header X-Tenant-Slug)")
    @GetMapping
    public ResponseEntity<List<TenantUnitResponse>> findActive() {
        return ResponseEntity.ok(
                tenantUnitService.findActiveByTenant(TenantContext.getRequiredTenantUUID()));
    }
}
