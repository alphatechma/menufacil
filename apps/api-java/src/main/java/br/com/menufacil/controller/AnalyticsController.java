package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.domain.enums.OrderStatus;
import br.com.menufacil.dto.AnalyticsOverviewResponse;
import br.com.menufacil.repository.OrderRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Slf4j
@Tag(name = "Analytics", description = "Dados analíticos do restaurante")
@RestController
@RequestMapping("/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final OrderRepository orderRepository;

    @Operation(summary = "Visão geral de métricas")
    @GetMapping("/overview")
    public ResponseEntity<AnalyticsOverviewResponse> overview(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to) {
        UUID tenantId = TenantContext.getRequiredTenantUUID();

        // Dados simplificados/mockados por enquanto
        // Em produção, usar queries agregadas com from/to
        long totalOrders = orderRepository.countByTenantId(tenantId);
        long cancelledOrders = orderRepository.countByTenantIdAndStatus(tenantId, OrderStatus.cancelled);

        BigDecimal revenue = BigDecimal.valueOf(totalOrders * 45.50).setScale(2, RoundingMode.HALF_UP);
        BigDecimal avgTicket = totalOrders > 0
                ? revenue.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        double cancelRate = totalOrders > 0
                ? (double) cancelledOrders / totalOrders * 100
                : 0.0;

        // Período anterior (mock simplificado)
        BigDecimal previousRevenue = revenue.multiply(BigDecimal.valueOf(0.85)).setScale(2, RoundingMode.HALF_UP);
        long previousOrders = (long) (totalOrders * 0.9);
        BigDecimal previousAvgTicket = previousOrders > 0
                ? previousRevenue.divide(BigDecimal.valueOf(previousOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        double previousCancelRate = cancelRate * 1.1;

        return ResponseEntity.ok(AnalyticsOverviewResponse.builder()
                .revenue(revenue)
                .previousRevenue(previousRevenue)
                .orders(totalOrders)
                .previousOrders(previousOrders)
                .avgTicket(avgTicket)
                .previousAvgTicket(previousAvgTicket)
                .cancelRate(cancelRate)
                .previousCancelRate(previousCancelRate)
                .build());
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
