package br.com.menufacil.service;

import br.com.menufacil.converter.AuditLogConverter;
import br.com.menufacil.domain.models.AuditLog;
import br.com.menufacil.dto.AuditLogResponse;
import br.com.menufacil.dto.AuditLogStatsResponse;
import br.com.menufacil.dto.CreateAuditLogRequest;
import br.com.menufacil.repository.AuditLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuditLogServiceTest {

    @Mock private AuditLogRepository auditLogRepository;
    @Mock private AuditLogConverter auditLogConverter;

    @InjectMocks
    private AuditLogService auditLogService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void shouldRegistrarLogDeAuditoria() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        CreateAuditLogRequest request = new CreateAuditLogRequest();
        request.setUserId(userId);
        request.setUserEmail("admin@menufacil.com.br");
        request.setAction("create");
        request.setEntityType("product");

        AuditLog entity = new AuditLog();
        AuditLog saved = new AuditLog();
        saved.setId(UUID.randomUUID());
        saved.setAction("create");
        AuditLogResponse response = AuditLogResponse.builder().action("create").build();

        when(auditLogConverter.toEntity(request)).thenReturn(entity);
        when(auditLogRepository.save(entity)).thenReturn(saved);
        when(auditLogConverter.toResponse(saved)).thenReturn(response);

        // Act
        AuditLogResponse result = auditLogService.log(tenantId, request);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getAction()).isEqualTo("create");
        ArgumentCaptor<AuditLog> captor = ArgumentCaptor.forClass(AuditLog.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getTenantId()).isEqualTo(tenantId);
    }

    @Test
    void shouldRegistrarLogPeloMetodoSimplificado() {
        // Arrange
        UUID tenantId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UUID entityId = UUID.randomUUID();

        when(auditLogRepository.save(any(AuditLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        AuditLog result = auditLogService.log(
                tenantId,
                userId,
                "admin@menufacil.com.br",
                "update",
                "category",
                entityId,
                "Pizzas",
                "{\"name\":\"Pizzas\"}",
                "127.0.0.1");

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getTenantId()).isEqualTo(tenantId);
        assertThat(result.getUserId()).isEqualTo(userId);
        assertThat(result.getAction()).isEqualTo("update");
        assertThat(result.getEntityType()).isEqualTo("category");
        verify(auditLogRepository).save(any(AuditLog.class));
    }

    @Test
    void shouldListarLogsComFiltrosEPaginacao() {
        // Arrange
        UUID userId = UUID.randomUUID();
        LocalDateTime from = LocalDateTime.now().minusDays(7);
        LocalDateTime to = LocalDateTime.now();

        AuditLog log1 = new AuditLog();
        log1.setAction("create");
        Page<AuditLog> page = new PageImpl<>(List.of(log1));

        when(auditLogRepository.findWithFilters(
                eq("create"), eq("product"), eq(userId), eq("admin"),
                eq(from), eq(to), any(Pageable.class)))
                .thenReturn(page);
        when(auditLogConverter.toResponse(log1))
                .thenReturn(AuditLogResponse.builder().action("create").build());

        // Act
        Page<AuditLogResponse> result = auditLogService.findAll(
                "create", "product", userId, "admin", from, to, 0, 50);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getAction()).isEqualTo("create");
    }

    @Test
    void shouldListarLogsComFiltrosNulos() {
        // Arrange
        Page<AuditLog> emptyPage = new PageImpl<>(List.of());
        when(auditLogRepository.findWithFilters(
                eq(null), eq(null), eq(null), eq(null),
                eq(null), eq(null), any(Pageable.class)))
                .thenReturn(emptyPage);

        // Act
        Page<AuditLogResponse> result = auditLogService.findAll(
                null, null, null, null, null, null, 0, 50);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isZero();
    }

    @Test
    void shouldRetornarEstatisticasUltimos30Dias() {
        // Arrange
        when(auditLogRepository.countSince(any(LocalDateTime.class))).thenReturn(150L);
        when(auditLogRepository.countByActionSince(any(LocalDateTime.class)))
                .thenReturn(List.of(
                        new Object[]{"create", 80L},
                        new Object[]{"update", 50L},
                        new Object[]{"delete", 20L}));
        when(auditLogRepository.countByEntityTypeSince(any(LocalDateTime.class)))
                .thenReturn(List.of(
                        new Object[]{"product", 100L},
                        new Object[]{"category", 50L}));
        when(auditLogRepository.countByDaySince(any(LocalDateTime.class)))
                .thenReturn(List.of(
                        new Object[]{"2026-06-19", 30L},
                        new Object[]{"2026-06-20", 40L}));

        // Act
        AuditLogStatsResponse stats = auditLogService.getStats();

        // Assert
        assertThat(stats).isNotNull();
        assertThat(stats.getTotalLogs()).isEqualTo(150L);
        assertThat(stats.getByAction())
                .containsEntry("create", 80L)
                .containsEntry("update", 50L)
                .containsEntry("delete", 20L);
        assertThat(stats.getByEntityType())
                .containsEntry("product", 100L)
                .containsEntry("category", 50L);
        assertThat(stats.getByDay()).hasSize(2);
        assertThat(stats.getByDay().get(0).getDate()).isEqualTo("2026-06-19");
        assertThat(stats.getByDay().get(0).getCount()).isEqualTo(30L);
    }
}
