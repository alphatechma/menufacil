package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.ApplyReferralRequest;
import br.com.menufacil.dto.ApplyReferralResponse;
import br.com.menufacil.dto.ReferralCodeResponse;
import br.com.menufacil.dto.ReferralResponse;
import br.com.menufacil.dto.ReferralStatsResponse;
import br.com.menufacil.service.ReferralService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

class ReferralControllerTest {

    @Mock private ReferralService referralService;

    @InjectMocks
    private ReferralController referralController;

    private UUID tenantId;
    private UUID customerId;
    private String customerIdHeader;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        customerIdHeader = customerId.toString();
        TenantContext.setCurrentTenant("tenant-slug", tenantId.toString());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldRetornarMeuCodigoDeIndicacao() {
        // Arrange
        ReferralCodeResponse expected = ReferralCodeResponse.builder().code("ABCD1234").build();
        when(referralService.getMyCode(customerId, tenantId)).thenReturn(expected);

        // Act
        ResponseEntity<ReferralCodeResponse> response = referralController.getMyCode(customerIdHeader);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo("ABCD1234");
    }

    @Test
    void shouldListarMinhasIndicacoes() {
        // Arrange
        when(referralService.getMyReferrals(customerId, tenantId))
                .thenReturn(List.of(ReferralResponse.builder().code("X").build()));

        // Act
        ResponseEntity<List<ReferralResponse>> response = referralController.getMyReferrals(customerIdHeader);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldAplicarCodigoDeIndicacao() {
        // Arrange
        ApplyReferralRequest request = new ApplyReferralRequest();
        request.setCode("VALIDCDE");

        ApplyReferralResponse serviceResponse = ApplyReferralResponse.builder()
                .success(true)
                .message("Código de indicação aplicado com sucesso!")
                .build();

        when(referralService.applyReferral(customerId, "VALIDCDE", tenantId)).thenReturn(serviceResponse);

        // Act
        ResponseEntity<ApplyReferralResponse> response =
                referralController.applyReferral(request, customerIdHeader);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
    }

    @Test
    void shouldRetornarEstatisticasDeIndicacao() {
        // Arrange
        ReferralStatsResponse stats = ReferralStatsResponse.builder()
                .totalReferrals(10L)
                .successfulReferrals(7L)
                .conversionRate(70.0)
                .totalPointsAwarded(70L)
                .topReferrers(List.of())
                .build();
        when(referralService.getStats(tenantId)).thenReturn(stats);

        // Act
        ResponseEntity<ReferralStatsResponse> response = referralController.getStats();

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTotalReferrals()).isEqualTo(10L);
        assertThat(response.getBody().getConversionRate()).isEqualTo(70.0);
    }

    @Test
    void shouldRetornarUnauthorizedQuandoHeaderCustomerAusente() {
        // Arrange
        ApplyReferralRequest request = new ApplyReferralRequest();
        request.setCode("ANYCODE1");

        // Act + Assert
        assertThatThrownBy(() -> referralController.applyReferral(request, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cliente não autenticado");
    }
}
