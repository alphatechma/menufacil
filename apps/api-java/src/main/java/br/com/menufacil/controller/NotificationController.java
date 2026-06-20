package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CreateNotificationRequest;
import br.com.menufacil.dto.NotificationResponse;
import br.com.menufacil.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Tag(name = "Notificações", description = "Gerenciamento de notificações (stub - envio real ainda não implementado)")
@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @Operation(summary = "Criar notificação (admin) - registra como pendente no banco")
    @PostMapping
    public ResponseEntity<NotificationResponse> create(@Valid @RequestBody CreateNotificationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(notificationService.create(TenantContext.getRequiredTenantUUID(), request));
    }

    @Operation(summary = "Listar notificações do tenant (admin)")
    @GetMapping
    public ResponseEntity<List<NotificationResponse>> list() {
        return ResponseEntity.ok(notificationService.listByTenant(TenantContext.getRequiredTenantUUID()));
    }

    @Operation(summary = "Buscar notificação por id (admin)")
    @GetMapping("/{id}")
    public ResponseEntity<NotificationResponse> getById(@PathVariable UUID id) {
        return ResponseEntity.ok(notificationService.getById(id));
    }
}
