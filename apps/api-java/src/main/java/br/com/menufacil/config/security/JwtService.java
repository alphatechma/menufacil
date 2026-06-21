package br.com.menufacil.config.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
public class JwtService {

    /**
     * Claim que identifica o tipo do token. Sempre presente:
     * <ul>
     *   <li>{@code access}   — JWT de admin (system_role, permissions)</li>
     *   <li>{@code customer} — JWT de cliente final (storefront)</li>
     *   <li>{@code refresh}  — refresh token (admin ou customer; diferenciados via {@link #CLAIM_SUBJECT_TYPE})</li>
     * </ul>
     */
    public static final String CLAIM_TYPE = "type";

    /**
     * Sub-tipo do refresh token: {@code admin} ou {@code customer}.
     * Permite que o endpoint /auth/refresh decida a estrategia de renovacao.
     */
    public static final String CLAIM_SUBJECT_TYPE = "subject_type";

    public static final String TYPE_ACCESS = "access";
    public static final String TYPE_CUSTOMER = "customer";
    public static final String TYPE_REFRESH = "refresh";

    public static final String SUBJECT_TYPE_ADMIN = "admin";
    public static final String SUBJECT_TYPE_CUSTOMER = "customer";

    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.access-expiration}")
    private long accessExpiration;

    @Value("${app.jwt.refresh-expiration}")
    private long refreshExpiration;

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return claims.getExpiration().after(new Date());
        } catch (Exception e) {
            return false;
        }
    }

    public String generateAccessToken(String email, Map<String, Object> extraClaims) {
        return buildToken(email, extraClaims, accessExpiration);
    }

    /**
     * Gera um refresh token para o fluxo de admin. Marca o token com
     * {@code type=refresh} e {@code subject_type=admin}.
     *
     * @param subject     subject do JWT (email do admin)
     * @param extraClaims claims adicionais (ex.: userId, tenant_id, tenant_slug)
     */
    public String generateRefreshToken(String subject, Map<String, Object> extraClaims) {
        Map<String, Object> claims = extraClaims == null ? new HashMap<>() : new HashMap<>(extraClaims);
        claims.put(CLAIM_TYPE, TYPE_REFRESH);
        claims.put(CLAIM_SUBJECT_TYPE, SUBJECT_TYPE_ADMIN);
        return buildToken(subject, claims, refreshExpiration);
    }

    /**
     * Overload de compatibilidade — emite um refresh token de admin sem claims extras.
     * Mantido para nao quebrar codigo legado que chamava {@code generateRefreshToken(email)}.
     */
    public String generateRefreshToken(String subject) {
        return generateRefreshToken(subject, new HashMap<>());
    }

    /**
     * Gera um access token para um customer (cliente final do storefront).
     * Garante que os claims essenciais (customerId, type=customer) estejam presentes.
     *
     * @param customerId UUID do customer (obrigatorio)
     * @param subject    valor do subject do JWT — normalmente email ou phone do customer
     * @param extraClaims claims adicionais a serem incluidos (tenant_id, tenant_slug, name, etc.)
     */
    public String generateCustomerAccessToken(String customerId, String subject, Map<String, Object> extraClaims) {
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("customerId is required to generate a customer JWT");
        }
        Map<String, Object> claims = extraClaims == null ? new HashMap<>() : new HashMap<>(extraClaims);
        claims.put("customerId", customerId);
        claims.put(CLAIM_TYPE, TYPE_CUSTOMER);
        return buildToken(subject, claims, accessExpiration);
    }

    /**
     * Gera um refresh token para o fluxo de customer (storefront).
     * Marca o token com {@code type=refresh}, {@code subject_type=customer} e
     * carrega o {@code customerId} para que o /auth/refresh possa identificar o cliente.
     *
     * @param customerId  UUID do customer (obrigatorio)
     * @param subject     subject do JWT (mesmo subject usado no access token)
     * @param extraClaims claims adicionais (ex.: tenant_id, tenant_slug)
     */
    public String generateCustomerRefreshToken(String customerId, String subject, Map<String, Object> extraClaims) {
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalArgumentException("customerId is required to generate a customer refresh token");
        }
        Map<String, Object> claims = extraClaims == null ? new HashMap<>() : new HashMap<>(extraClaims);
        claims.put(CLAIM_TYPE, TYPE_REFRESH);
        claims.put(CLAIM_SUBJECT_TYPE, SUBJECT_TYPE_CUSTOMER);
        claims.put("customerId", customerId);
        return buildToken(subject, claims, refreshExpiration);
    }

    /**
     * Parseia e valida um refresh token.
     *
     * <p>Erros mapeados para HTTP:
     * <ul>
     *   <li>{@link ExpiredJwtException}   -> 401 (refresh token expirado)</li>
     *   <li>Assinatura/formato invalidos -> 401 (refresh token invalido)</li>
     *   <li>Claim {@code type} != refresh -> 401 (token nao e refresh)</li>
     * </ul>
     *
     * @param token refresh token a validar
     * @return Claims contidos no token
     * @throws ResponseStatusException 401 quando o token e invalido, expirado ou de tipo errado
     */
    public Claims parseRefreshToken(String token) {
        Claims claims;
        try {
            claims = extractAllClaims(token);
        } catch (ExpiredJwtException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token expirado");
        } catch (JwtException | IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalido");
        }

        String type = claims.get(CLAIM_TYPE, String.class);
        if (!TYPE_REFRESH.equals(type)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Token informado nao e um refresh token");
        }

        return claims;
    }

    private String buildToken(String email, Map<String, Object> extraClaims, long expirationMs) {
        return Jwts.builder()
                .claims(extraClaims)
                .subject(email)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + expirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    private SecretKey getSigningKey() {
        try {
            byte[] keyBytes = Decoders.BASE64.decode(secret);
            return Keys.hmacShaKeyFor(keyBytes);
        } catch (Exception e) {
            // Fallback: usar secret como string direta
            return Keys.hmacShaKeyFor(secret.getBytes());
        }
    }
}
