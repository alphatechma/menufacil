package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.TenantUnitResponse;
import br.com.menufacil.service.TenantUnitService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

class TenantUnitPublicControllerTest {

    @Mock private TenantUnitService tenantUnitService;

    @InjectMocks
    private TenantUnitPublicController tenantUnitPublicController;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenant("tenant-slug", tenantId.toString());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldListarUnidadesAtivasDoTenantPublico() {
        // Arrange
        when(tenantUnitService.findActiveByTenant(tenantId))
                .thenReturn(List.of(
                        TenantUnitResponse.builder().name("Centro").active(true).build(),
                        TenantUnitResponse.builder().name("Filial").active(true).build()
                ));

        // Act
        ResponseEntity<List<TenantUnitResponse>> response = tenantUnitPublicController.findActive();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(2);
        assertThat(response.getBody().get(0).isActive()).isTrue();
    }
}
