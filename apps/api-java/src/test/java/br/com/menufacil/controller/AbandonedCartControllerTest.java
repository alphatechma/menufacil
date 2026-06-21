package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.AbandonedCartResponse;
import br.com.menufacil.dto.AbandonedCartStatsResponse;
import br.com.menufacil.dto.SaveAbandonedCartRequest;
import br.com.menufacil.service.AbandonedCartService;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AbandonedCartControllerTest {

    @Mock private AbandonedCartService abandonedCartService;

    @InjectMocks
    private AbandonedCartController abandonedCartController;

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
    void shouldSalvarCarrinho() {
        // Arrange
        SaveAbandonedCartRequest request = new SaveAbandonedCartRequest();
        request.setCustomerId(UUID.randomUUID());
        request.setItems("[]");
        request.setTotal(new BigDecimal("10.00"));

        AbandonedCartResponse response = AbandonedCartResponse.builder().build();
        when(abandonedCartService.saveCart(eq(tenantId), any(SaveAbandonedCartRequest.class)))
                .thenReturn(response);

        // Act
        ResponseEntity<AbandonedCartResponse> result = abandonedCartController.save(request);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(result.getBody()).isNotNull();
    }

    @Test
    void shouldRecuperarCarrinhoQuandoExiste() {
        // Arrange
        UUID customerId = UUID.randomUUID();
        AbandonedCartResponse response = AbandonedCartResponse.builder().build();
        when(abandonedCartService.getRecoverableCart(tenantId, customerId))
                .thenReturn(Optional.of(response));

        // Act
        ResponseEntity<AbandonedCartResponse> result = abandonedCartController.recover(customerId);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
    }

    @Test
    void shouldRetornarNoContentQuandoNaoExisteCarrinhoRecuperavel() {
        // Arrange
        UUID customerId = UUID.randomUUID();
        when(abandonedCartService.getRecoverableCart(tenantId, customerId))
                .thenReturn(Optional.empty());

        // Act
        ResponseEntity<AbandonedCartResponse> result = abandonedCartController.recover(customerId);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(result.getBody()).isNull();
    }

    @Test
    void shouldRecuperarMeuCarrinhoUsandoJwt() {
        // Arrange — cliente autenticado via JWT
        UUID customerId = UUID.randomUUID();
        authenticateAsCustomer(customerId);
        AbandonedCartResponse response = AbandonedCartResponse.builder().build();
        when(abandonedCartService.getRecoverableCart(tenantId, customerId))
                .thenReturn(Optional.of(response));

        // Act
        ResponseEntity<AbandonedCartResponse> result = abandonedCartController.myRecover();

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
    }

    @Test
    void shouldRetornarUnauthorizedEmMyRecoverSemJwt() {
        // Arrange — sem autenticacao no SecurityContext

        // Act + Assert
        assertThatThrownBy(() -> abandonedCartController.myRecover())
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cliente não autenticado");
    }

    @Test
    void shouldListarCarrinhosAbandonadosPaginados() {
        // Arrange
        Page<AbandonedCartResponse> page = new PageImpl<>(List.of(AbandonedCartResponse.builder().build()));
        when(abandonedCartService.findAll(tenantId, 0, 20)).thenReturn(page);

        // Act
        ResponseEntity<Page<AbandonedCartResponse>> result = abandonedCartController.findAll(0, 20);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getContent()).hasSize(1);
    }

    @Test
    void shouldRetornarEstatisticas() {
        // Arrange
        AbandonedCartStatsResponse stats = AbandonedCartStatsResponse.builder()
                .total(5L)
                .totalRecovered(2L)
                .recoveryRate(40.0)
                .lostRevenue(new BigDecimal("99.90"))
                .build();
        when(abandonedCartService.getStats(tenantId)).thenReturn(stats);

        // Act
        ResponseEntity<AbandonedCartStatsResponse> result = abandonedCartController.getStats();

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getTotal()).isEqualTo(5L);
        assertThat(result.getBody().getRecoveryRate()).isEqualTo(40.0);
    }
}
