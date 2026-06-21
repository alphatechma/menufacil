package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.LoyaltyRedemptionResponse;
import br.com.menufacil.dto.RedeemRewardRequest;
import br.com.menufacil.service.LoyaltyService;
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

class LoyaltyControllerTest {

    @Mock private LoyaltyService loyaltyService;

    @InjectMocks
    private LoyaltyController loyaltyController;

    private UUID tenantId;
    private UUID customerId;
    private UUID rewardId;
    private String customerIdHeader;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
        customerId = UUID.randomUUID();
        rewardId = UUID.randomUUID();
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

    private RedeemRewardRequest buildRedeemRequest(UUID rewardId) {
        RedeemRewardRequest request = new RedeemRewardRequest();
        request.setRewardId(rewardId.toString());
        return request;
    }

    @Test
    void shouldResgatarRecompensaUsandoJwt() {
        // Arrange
        authenticateAsCustomer(customerId);
        RedeemRewardRequest request = buildRedeemRequest(rewardId);
        LoyaltyRedemptionResponse expected = LoyaltyRedemptionResponse.builder()
                .id(UUID.randomUUID().toString())
                .customerId(customerId.toString())
                .rewardId(rewardId.toString())
                .pointsSpent(100)
                .status("ACTIVE")
                .build();
        when(loyaltyService.redeemReward(customerId, rewardId, tenantId)).thenReturn(expected);

        // Act — sem header, controller deve preferir o JWT
        ResponseEntity<LoyaltyRedemptionResponse> response = loyaltyController.redeem(request, null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCustomerId()).isEqualTo(customerId.toString());
        assertThat(response.getBody().getRewardId()).isEqualTo(rewardId.toString());
    }

    @Test
    void shouldResgatarRecompensaUsandoHeaderQuandoJwtAusente() {
        // Arrange — sem autenticacao, controller cai no header (fallback)
        RedeemRewardRequest request = buildRedeemRequest(rewardId);
        LoyaltyRedemptionResponse expected = LoyaltyRedemptionResponse.builder()
                .id(UUID.randomUUID().toString())
                .customerId(customerId.toString())
                .rewardId(rewardId.toString())
                .pointsSpent(50)
                .status("ACTIVE")
                .build();
        when(loyaltyService.redeemReward(customerId, rewardId, tenantId)).thenReturn(expected);

        // Act
        ResponseEntity<LoyaltyRedemptionResponse> response =
                loyaltyController.redeem(request, customerIdHeader);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPointsSpent()).isEqualTo(50);
    }

    @Test
    void shouldListarMeusResgatesUsandoJwt() {
        // Arrange
        authenticateAsCustomer(customerId);
        LoyaltyRedemptionResponse redemption = LoyaltyRedemptionResponse.builder()
                .id(UUID.randomUUID().toString())
                .customerId(customerId.toString())
                .rewardId(rewardId.toString())
                .pointsSpent(100)
                .status("ACTIVE")
                .build();
        when(loyaltyService.findRedemptionsByCustomer(customerId, tenantId))
                .thenReturn(List.of(redemption));

        // Act
        ResponseEntity<List<LoyaltyRedemptionResponse>> response =
                loyaltyController.myRedemptions(null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getCustomerId()).isEqualTo(customerId.toString());
    }

    @Test
    void shouldListarMeusResgatesUsandoHeaderQuandoJwtAusente() {
        // Arrange
        when(loyaltyService.findRedemptionsByCustomer(customerId, tenantId))
                .thenReturn(List.of());

        // Act
        ResponseEntity<List<LoyaltyRedemptionResponse>> response =
                loyaltyController.myRedemptions(customerIdHeader);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void shouldRetornarUnauthorizedNoRedeemQuandoSemJwtESemHeader() {
        // Arrange — sem autenticacao e sem header
        RedeemRewardRequest request = buildRedeemRequest(rewardId);

        // Act + Assert
        assertThatThrownBy(() -> loyaltyController.redeem(request, null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cliente não autenticado");
    }

    @Test
    void shouldRetornarUnauthorizedEmMyRedemptionsQuandoSemJwtESemHeader() {
        // Act + Assert
        assertThatThrownBy(() -> loyaltyController.myRedemptions(null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cliente não autenticado");
    }

    @Test
    void shouldRetornarBadRequestQuandoHeaderXCustomerIdInvalido() {
        // Arrange — sem JWT, header com UUID malformado
        RedeemRewardRequest request = buildRedeemRequest(rewardId);

        // Act + Assert
        assertThatThrownBy(() -> loyaltyController.redeem(request, "nao-eh-uuid"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("X-Customer-Id inválido");
    }

    @Test
    void jwtTemPrioridadeSobreHeaderNoRedeem() {
        // Arrange — JWT presente com um customerId e header com outro: JWT vence
        UUID jwtCustomerId = UUID.randomUUID();
        UUID headerCustomerId = UUID.randomUUID();
        authenticateAsCustomer(jwtCustomerId);

        RedeemRewardRequest request = buildRedeemRequest(rewardId);
        LoyaltyRedemptionResponse expected = LoyaltyRedemptionResponse.builder()
                .id(UUID.randomUUID().toString())
                .customerId(jwtCustomerId.toString())
                .rewardId(rewardId.toString())
                .pointsSpent(200)
                .status("ACTIVE")
                .build();
        when(loyaltyService.redeemReward(jwtCustomerId, rewardId, tenantId)).thenReturn(expected);

        // Act
        ResponseEntity<LoyaltyRedemptionResponse> response =
                loyaltyController.redeem(request, headerCustomerId.toString());

        // Assert — service foi chamado com o customerId do JWT, nao do header
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCustomerId()).isEqualTo(jwtCustomerId.toString());
    }
}
