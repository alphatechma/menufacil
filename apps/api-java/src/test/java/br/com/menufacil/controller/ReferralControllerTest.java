package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.ApplyReferralRequest;
import br.com.menufacil.dto.ApplyReferralResponse;
import br.com.menufacil.dto.ReferralCodeResponse;
import br.com.menufacil.dto.ReferralResponse;
import br.com.menufacil.dto.ReferralStatsResponse;
import br.com.menufacil.service.ReferralService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
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
        SecurityContextHolder.clearContext();
    }

    /**
     * Coloca um Authentication mockado no SecurityContext cujo {@code getDetails()}
     * retorna Claims com o customerId informado. Espelha o que o
     * {@code JwtAuthenticationFilter} faz em producao.
     */
    private void authenticateAsCustomer(UUID customerId) {
        Claims claims = mock(Claims.class);
        when(claims.get("customerId", String.class)).thenReturn(customerId.toString());
        when(claims.get("type", String.class)).thenReturn("customer");

        var auth = new UsernamePasswordAuthenticationToken(
                "customer@example.com",
                "token",
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")));
        auth.setDetails(claims);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    void shouldRetornarMeuCodigoDeIndicacaoUsandoJwt() {
        // Arrange — autenticacao via JWT (sem header)
        authenticateAsCustomer(customerId);
        ReferralCodeResponse expected = ReferralCodeResponse.builder().code("ABCD1234").build();
        when(referralService.getMyCode(customerId, tenantId)).thenReturn(expected);

        // Act — passa null pro header, controller deve preferir o JWT
        ResponseEntity<ReferralCodeResponse> response = referralController.getMyCode(null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo("ABCD1234");
    }

    @Test
    void shouldRetornarMeuCodigoUsandoHeaderQuandoJwtAusente() {
        // Arrange — sem autenticacao, controller cai no header (fallback)
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
        authenticateAsCustomer(customerId);
        when(referralService.getMyReferrals(customerId, tenantId))
                .thenReturn(List.of(ReferralResponse.builder().code("X").build()));

        // Act
        ResponseEntity<List<ReferralResponse>> response = referralController.getMyReferrals(null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
    }

    @Test
    void shouldAplicarCodigoDeIndicacao() {
        // Arrange
        authenticateAsCustomer(customerId);
        ApplyReferralRequest request = new ApplyReferralRequest();
        request.setCode("VALIDCDE");

        ApplyReferralResponse serviceResponse = ApplyReferralResponse.builder()
                .success(true)
                .message("Código de indicação aplicado com sucesso!")
                .build();

        when(referralService.applyReferral(customerId, "VALIDCDE", tenantId)).thenReturn(serviceResponse);

        // Act
        ResponseEntity<ApplyReferralResponse> response =
                referralController.applyReferral(request, null);

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
    void shouldRetornarUnauthorizedQuandoSemJwtESemHeader() {
        // Arrange — sem autenticacao e sem header
        ApplyReferralRequest request = new ApplyReferralRequest();
        request.setCode("ANYCODE1");

        // Act + Assert
        assertThatThrownBy(() -> referralController.applyReferral(request, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cliente não autenticado");
    }

    @Test
    void jwtTemPrioridadeSobreHeader() {
        // Arrange — JWT presente com um customerId e header com outro: JWT vence
        UUID jwtCustomerId = UUID.randomUUID();
        UUID headerCustomerId = UUID.randomUUID();
        authenticateAsCustomer(jwtCustomerId);

        when(referralService.getMyCode(jwtCustomerId, tenantId))
                .thenReturn(ReferralCodeResponse.builder().code("FROM-JWT").build());

        // Act
        ResponseEntity<ReferralCodeResponse> response =
                referralController.getMyCode(headerCustomerId.toString());

        // Assert
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCode()).isEqualTo("FROM-JWT");
    }
}
