package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.TableSessionResponse;
import br.com.menufacil.service.RestaurantTableService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Tag(name = "Sessões de Mesa", description = "Gerenciamento de sessões de mesa")
@RestController
@RequestMapping("/table-sessions")
@RequiredArgsConstructor
public class TableSessionController {

    private final RestaurantTableService tableService;

    @Operation(summary = "Listar sessões por mesa")
    @GetMapping
    public ResponseEntity<List<TableSessionResponse>> listByTable(
            @RequestParam UUID tableId) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(tableService.findSessionsByTable(tableId, tenantId));
    }

    @Operation(summary = "Fechar sessão de mesa")
    @PostMapping("/{id}/close")
    public ResponseEntity<TableSessionResponse> closeSession(@PathVariable UUID id) {
        UUID tenantId = getTenantId();
        return ResponseEntity.ok(tableService.closeSession(id, tenantId));
    }

    private UUID getTenantId() {
        String tenantIdStr = TenantContext.getCurrentId();
        if (tenantIdStr == null || tenantIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Header X-Tenant-Slug é obrigatório");
        }
        return UUID.fromString(tenantIdStr);
    }
}
