package br.com.menufacil.config.security;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Testes do {@link JwtService} cobrindo o fluxo de refresh token introduzido
 * no Item 5 (refresh token flow).
 *
 * <p>Pontos cobertos:
 * <ul>
 *   <li>generateRefreshToken (admin) carrega type=refresh + subject_type=admin
 *       e respeita a expiracao de refresh (NAO a de access)</li>
 *   <li>generateCustomerRefreshToken carrega customerId + type=refresh + subject_type=customer</li>
 *   <li>parseRefreshToken aceita refresh tokens e rejeita access tokens com 401</li>
 *   <li>parseRefreshToken rejeita tokens invalidos / expirados com 401</li>
 * </ul>
 */
class JwtServiceTest {

    private static final long ACCESS_EXPIRATION_MS = 900_000L;      // 15 min
    private static final long REFRESH_EXPIRATION_MS = 604_800_000L; // 7 dias
    private static final long FIVE_SECONDS = 5_000L;
    private static final long FIFTY_SECONDS = 50_000L;

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        ReflectionTestUtils.setField(jwtService, "secret",
                "dGVzdC1zZWNyZXQta2V5LW1pbmltdW0tMzItYnl0ZXMtbG9uZy0xMjM0NTY=");
        ReflectionTestUtils.setField(jwtService, "accessExpiration", ACCESS_EXPIRATION_MS);
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", REFRESH_EXPIRATION_MS);
    }

    // ------------------------------------------------------------------
    // generateRefreshToken (admin)
    // ------------------------------------------------------------------

    @Test
    void generateRefreshToken_deveMarcarTypeRefreshESubjectTypeAdmin() {
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", UUID.randomUUID().toString());
        claims.put("tenant_id", UUID.randomUUID().toString());

        String token = jwtService.generateRefreshToken("admin@example.com", claims);

        Claims parsed = jwtService.extractAllClaims(token);
        assertThat(parsed.get(JwtService.CLAIM_TYPE, String.class)).isEqualTo(JwtService.TYPE_REFRESH);
        assertThat(parsed.get(JwtService.CLAIM_SUBJECT_TYPE, String.class)).isEqualTo(JwtService.SUBJECT_TYPE_ADMIN);
        assertThat(parsed.getSubject()).isEqualTo("admin@example.com");
        assertThat(parsed.get("tenant_id", String.class)).isNotBlank();
    }

    @Test
    void generateRefreshToken_deveUsarExpiracaoDeRefreshNaoDeAccess() {
        String token = jwtService.generateRefreshToken("admin@example.com");

        Claims parsed = jwtService.extractAllClaims(token);
        long expectedExpMillis = System.currentTimeMillis() + REFRESH_EXPIRATION_MS;
        long actualExpMillis = parsed.getExpiration().getTime();

        // Tolera 5s de jitter (build/test runtime).
        assertThat(actualExpMillis)
                .as("Refresh token deve expirar em ~7 dias")
                .isBetween(expectedExpMillis - FIVE_SECONDS, expectedExpMillis + FIVE_SECONDS);

        // Garante explicitamente que NAO usou a janela do access token.
        long accessWindowExp = System.currentTimeMillis() + ACCESS_EXPIRATION_MS;
        assertThat(actualExpMillis)
                .as("Refresh token NAO deve expirar na janela do access (15min)")
                .isGreaterThan(accessWindowExp + FIFTY_SECONDS);
    }

    @Test
    void generateRefreshToken_overloadSemClaimsDeveFuncionar() {
        String token = jwtService.generateRefreshToken("admin@example.com");

        Claims parsed = jwtService.extractAllClaims(token);
        assertThat(parsed.get(JwtService.CLAIM_TYPE, String.class)).isEqualTo(JwtService.TYPE_REFRESH);
        assertThat(parsed.get(JwtService.CLAIM_SUBJECT_TYPE, String.class)).isEqualTo(JwtService.SUBJECT_TYPE_ADMIN);
    }

    // ------------------------------------------------------------------
    // generateCustomerRefreshToken
    // ------------------------------------------------------------------

    @Test
    void generateCustomerRefreshToken_deveCarregarCustomerIdETypeRefreshCustomer() {
        String customerId = UUID.randomUUID().toString();
        Map<String, Object> claims = new HashMap<>();
        claims.put("tenant_id", UUID.randomUUID().toString());
        claims.put("tenant_slug", "teste");

        String token = jwtService.generateCustomerRefreshToken(customerId, "cliente@example.com", claims);

        Claims parsed = jwtService.extractAllClaims(token);
        assertThat(parsed.get("customerId", String.class)).isEqualTo(customerId);
        assertThat(parsed.get(JwtService.CLAIM_TYPE, String.class)).isEqualTo(JwtService.TYPE_REFRESH);
        assertThat(parsed.get(JwtService.CLAIM_SUBJECT_TYPE, String.class)).isEqualTo(JwtService.SUBJECT_TYPE_CUSTOMER);
        assertThat(parsed.getSubject()).isEqualTo("cliente@example.com");
        assertThat(parsed.get("tenant_slug", String.class)).isEqualTo("teste");
    }

    @Test
    void generateCustomerRefreshToken_deveLancarQuandoCustomerIdAusente() {
        assertThatThrownBy(() ->
                jwtService.generateCustomerRefreshToken(null, "x@y.com", null))
                .isInstanceOf(IllegalArgumentException.class);

        assertThatThrownBy(() ->
                jwtService.generateCustomerRefreshToken("", "x@y.com", null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ------------------------------------------------------------------
    // parseRefreshToken
    // ------------------------------------------------------------------

    @Test
    void parseRefreshToken_deveAceitarRefreshDeAdmin() {
        String token = jwtService.generateRefreshToken("admin@example.com");

        Claims parsed = jwtService.parseRefreshToken(token);

        assertThat(parsed.get(JwtService.CLAIM_TYPE, String.class)).isEqualTo(JwtService.TYPE_REFRESH);
        assertThat(parsed.get(JwtService.CLAIM_SUBJECT_TYPE, String.class)).isEqualTo(JwtService.SUBJECT_TYPE_ADMIN);
    }

    @Test
    void parseRefreshToken_deveAceitarRefreshDeCustomer() {
        String customerId = UUID.randomUUID().toString();
        String token = jwtService.generateCustomerRefreshToken(customerId, "cliente@example.com", null);

        Claims parsed = jwtService.parseRefreshToken(token);

        assertThat(parsed.get("customerId", String.class)).isEqualTo(customerId);
        assertThat(parsed.get(JwtService.CLAIM_SUBJECT_TYPE, String.class)).isEqualTo(JwtService.SUBJECT_TYPE_CUSTOMER);
    }

    @Test
    void parseRefreshToken_deveRejeitarAccessTokenComoRefresh() {
        // Access token de admin (type=access)
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", UUID.randomUUID().toString());
        claims.put(JwtService.CLAIM_TYPE, JwtService.TYPE_ACCESS);
        String accessToken = jwtService.generateAccessToken("admin@example.com", claims);

        assertThatThrownBy(() -> jwtService.parseRefreshToken(accessToken))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void parseRefreshToken_deveRejeitarCustomerAccessTokenComoRefresh() {
        String customerId = UUID.randomUUID().toString();
        String accessToken = jwtService.generateCustomerAccessToken(
                customerId, "cliente@example.com", null);

        assertThatThrownBy(() -> jwtService.parseRefreshToken(accessToken))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void parseRefreshToken_deveRejeitarTokenInvalido() {
        assertThatThrownBy(() -> jwtService.parseRefreshToken("nao-e-um-jwt"))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        assertThatThrownBy(() -> jwtService.parseRefreshToken(""))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void parseRefreshToken_deveRejeitarTokenExpiradoCom401() {
        // Setamos a expiracao para um valor negativo (refresh emitido ja expirado).
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", -1_000L);
        String expirado = jwtService.generateRefreshToken("admin@example.com");
        // Restaura para nao afetar outros casos.
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", REFRESH_EXPIRATION_MS);

        assertThatThrownBy(() -> jwtService.parseRefreshToken(expirado))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
