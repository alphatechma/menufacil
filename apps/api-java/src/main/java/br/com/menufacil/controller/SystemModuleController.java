package br.com.menufacil.controller;

import br.com.menufacil.dto.CreateSystemModuleRequest;
import br.com.menufacil.dto.SystemModuleResponse;
import br.com.menufacil.service.SystemModuleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Super Admin - Módulos do Sistema", description = "Gerenciamento global de módulos do sistema")
@RestController
@RequestMapping("/super-admin/system-modules")
@RequiredArgsConstructor
public class SystemModuleController {

    private final SystemModuleService systemModuleService;

    @Operation(summary = "Listar todos os módulos do sistema")
    @GetMapping
    public ResponseEntity<List<SystemModuleResponse>> findAll() {
        return ResponseEntity.ok(systemModuleService.findAll());
    }

    @Operation(summary = "Buscar módulo do sistema por ID")
    @GetMapping("/{id}")
    public ResponseEntity<SystemModuleResponse> findById(@PathVariable UUID id) {
        return ResponseEntity.ok(systemModuleService.findById(id));
    }

    @Operation(summary = "Criar módulo do sistema")
    @PostMapping
    public ResponseEntity<SystemModuleResponse> create(@Valid @RequestBody CreateSystemModuleRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(systemModuleService.create(request));
    }

    @Operation(summary = "Atualizar módulo do sistema")
    @PutMapping("/{id}")
    public ResponseEntity<SystemModuleResponse> update(
            @PathVariable UUID id,
            @Valid @RequestBody CreateSystemModuleRequest request) {
        return ResponseEntity.ok(systemModuleService.update(id, request));
    }

    @Operation(summary = "Remover módulo do sistema")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        systemModuleService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
