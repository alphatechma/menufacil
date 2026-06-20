package br.com.menufacil.controller;

import br.com.menufacil.dto.AuditLogResponse;
import br.com.menufacil.dto.AuditLogStatsResponse;
import br.com.menufacil.service.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

class AuditLogControllerTest {

    @Mock private AuditLogService auditLogService;

    @InjectMocks
    private AuditLogController auditLogController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldListarLogsComFiltros() {
        // Arrange
        UUID userId = UUID.randomUUID();
        LocalDateTime from = LocalDateTime.now().minusDays(7);
        LocalDateTime to = LocalDateTime.now();
        Page<AuditLogResponse> page = new PageImpl<>(List.of(
                AuditLogResponse.builder().action("create").build()));

        when(auditLogService.findAll(
                eq("create"), eq("product"), eq(userId), eq("admin"),
                eq(from), eq(to), anyInt(), anyInt()))
                .thenReturn(page);

        // Act
        ResponseEntity<Page<AuditLogResponse>> response = auditLogController.findAll(
                "create", "product", userId, "admin", from, to, 0, 50);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTotalElements()).isEqualTo(1);
    }

    @Test
    void shouldRetornarEstatisticas() {
        // Arrange
        AuditLogStatsResponse stats = AuditLogStatsResponse.builder()
                .totalLogs(150L)
                .byAction(Map.of("create", 80L))
                .byEntityType(Map.of("product", 100L))
                .byDay(List.of(AuditLogStatsResponse.DailyCount.builder()
                        .date("2026-06-20").count(40L).build()))
                .build();

        when(auditLogService.getStats()).thenReturn(stats);

        // Act
        ResponseEntity<AuditLogStatsResponse> response = auditLogController.getStats();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTotalLogs()).isEqualTo(150L);
        assertThat(response.getBody().getByAction()).containsEntry("create", 80L);
        assertThat(response.getBody().getByDay()).hasSize(1);
    }
}
