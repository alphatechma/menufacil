package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.WalletResponse;
import br.com.menufacil.dto.WalletTransactionResponse;
import br.com.menufacil.service.WalletService;
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

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WalletControllerTest {

    @Mock private WalletService walletService;

    @InjectMocks
    private WalletController walletController;

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
    void shouldRetornarMeuSaldoUsandoJwt() {
        // Arrange — autenticacao via JWT (sem header)
        authenticateAsCustomer(customerId);
        WalletResponse expected = WalletResponse.builder()
                .id(UUID.randomUUID().toString())
                .customerId(customerId.toString())
                .balance(new BigDecimal("150.00"))
                .build();
        when(walletService.getBalance(customerId, tenantId)).thenReturn(expected);

        // Act — passa null pro header, controller deve preferir o JWT
        ResponseEntity<WalletResponse> response = walletController.getMyBalance(null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getBalance()).isEqualByComparingTo("150.00");
        assertThat(response.getBody().getCustomerId()).isEqualTo(customerId.toString());
    }

    @Test
    void shouldRetornarMeuSaldoUsandoHeaderQuandoJwtAusente() {
        // Arrange — sem autenticacao, controller cai no header (fallback)
        WalletResponse expected = WalletResponse.builder()
                .id(UUID.randomUUID().toString())
                .customerId(customerId.toString())
                .balance(new BigDecimal("42.50"))
                .build();
        when(walletService.getBalance(customerId, tenantId)).thenReturn(expected);

        // Act
        ResponseEntity<WalletResponse> response = walletController.getMyBalance(customerIdHeader);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getBalance()).isEqualByComparingTo("42.50");
    }

    @Test
    void shouldListarMinhasTransacoesUsandoJwt() {
        // Arrange
        authenticateAsCustomer(customerId);
        WalletTransactionResponse tx = WalletTransactionResponse.builder()
                .id(UUID.randomUUID().toString())
                .type("credit")
                .amount(new BigDecimal("20.00"))
                .description("Bônus de boas-vindas")
                .build();
        when(walletService.getTransactions(customerId, tenantId)).thenReturn(List.of(tx));

        // Act
        ResponseEntity<List<WalletTransactionResponse>> response =
                walletController.getMyTransactions(null);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody().get(0).getType()).isEqualTo("credit");
        assertThat(response.getBody().get(0).getAmount()).isEqualByComparingTo("20.00");
    }

    @Test
    void shouldListarMinhasTransacoesUsandoHeaderQuandoJwtAusente() {
        // Arrange — sem autenticacao, controller cai no header
        when(walletService.getTransactions(customerId, tenantId))
                .thenReturn(List.of());

        // Act
        ResponseEntity<List<WalletTransactionResponse>> response =
                walletController.getMyTransactions(customerIdHeader);

        // Assert
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void shouldRetornarUnauthorizedQuandoSaldoSemJwtESemHeader() {
        // Arrange — sem autenticacao e sem header
        // Act + Assert
        assertThatThrownBy(() -> walletController.getMyBalance(null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cliente não autenticado");
    }

    @Test
    void shouldRetornarUnauthorizedQuandoTransacoesSemJwtESemHeader() {
        // Arrange — sem autenticacao e sem header
        // Act + Assert
        assertThatThrownBy(() -> walletController.getMyTransactions(null))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cliente não autenticado");
    }

    @Test
    void shouldRetornarBadRequestQuandoHeaderInvalido() {
        // Arrange — sem JWT e header com valor que nao e UUID
        // Act + Assert
        assertThatThrownBy(() -> walletController.getMyBalance("nao-e-uuid"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("X-Customer-Id inválido");
    }

    @Test
    void jwtTemPrioridadeSobreHeader() {
        // Arrange — JWT com um customerId e header com outro: JWT vence
        UUID jwtCustomerId = UUID.randomUUID();
        UUID headerCustomerId = UUID.randomUUID();
        authenticateAsCustomer(jwtCustomerId);

        WalletResponse expected = WalletResponse.builder()
                .id(UUID.randomUUID().toString())
                .customerId(jwtCustomerId.toString())
                .balance(new BigDecimal("99.99"))
                .build();
        when(walletService.getBalance(jwtCustomerId, tenantId)).thenReturn(expected);

        // Act
        ResponseEntity<WalletResponse> response =
                walletController.getMyBalance(headerCustomerId.toString());

        // Assert
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getCustomerId()).isEqualTo(jwtCustomerId.toString());
        assertThat(response.getBody().getBalance()).isEqualByComparingTo("99.99");
    }
}
