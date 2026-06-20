package br.com.menufacil.controller;

import br.com.menufacil.config.security.RequirePermissions;
import br.com.menufacil.dto.AssignPlanModulesRequest;
import br.com.menufacil.dto.CreatePlanRequest;
import br.com.menufacil.dto.PlanResponse;
import br.com.menufacil.service.PlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Super Admin - Planos", description = "Gerenciamento global de planos de assinatura")
@RestController
@RequestMapping("/super-admin/plans")
@RequiredArgsConstructor
public class PlanController {

    private final PlanService planService;

    @Operation(summary = "Listar todos os planos")
    @RequirePermissions("plan:read")
    @GetMapping
    public ResponseEntity<List<PlanResponse>> findAll() {
        return ResponseEntity.ok(planService.findAll());
    }

    @Operation(summary = "Buscar plano por ID")
    @RequirePermissions("plan:read")
    @GetMapping("/{id}")
    public ResponseEntity<PlanResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(planService.findById(id));
    }

    @Operation(summary = "Criar plano")
    @RequirePermissions("plan:create")
    @PostMapping
    public ResponseEntity<PlanResponse> create(@Valid @RequestBody CreatePlanRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(planService.create(request));
    }

    @Operation(summary = "Atualizar plano")
    @RequirePermissions("plan:update")
    @PutMapping("/{id}")
    public ResponseEntity<PlanResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreatePlanRequest request) {
        return ResponseEntity.ok(planService.update(id, request));
    }

    @Operation(summary = "Remover plano")
    @RequirePermissions("plan:delete")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        planService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Atribuir módulos ao plano (substitui a lista atual)")
    @RequirePermissions("plan:update")
    @PutMapping("/{id}/modules")
    public ResponseEntity<PlanResponse> assignModules(
            @PathVariable UUID id,
            @Valid @RequestBody AssignPlanModulesRequest request) {
        return ResponseEntity.ok(planService.assignModules(id, request.getModuleIds()));
    }
}
