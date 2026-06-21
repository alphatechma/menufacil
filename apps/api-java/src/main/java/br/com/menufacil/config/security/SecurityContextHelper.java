package br.com.menufacil.config.security;

import io.jsonwebtoken.Claims;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

/**
 * Helpers para extrair informacoes do JWT armazenado no SecurityContext.
 *
 * Convencao: o {@link JwtAuthenticationFilter} coloca o {@link Claims} do token
 * em {@link Authentication#getDetails()}, entao todos os getters abaixo dependem
 * dessa convencao.
 */
public final class SecurityContextHelper {

    private SecurityContextHelper() {}

    /**
     * Retorna os Claims do JWT atual, se houver. Vazio se nao houver autenticacao
     * ou se os details nao forem Claims.
     */
    public static Optional<Claims> getCurrentClaims() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return Optional.empty();
        }
        Object details = auth.getDetails();
        if (details instanceof Claims claims) {
            return Optional.of(claims);
        }
        return Optional.empty();
    }

    /**
     * Extrai um claim String do JWT atual.
     */
    public static Optional<String> getClaim(String name) {
        return getCurrentClaims()
                .map(c -> c.get(name, String.class))
                .filter(v -> v != null && !v.isBlank());
    }

    /**
     * Retorna o tipo do token (ex.: "access", "customer"). Vazio se nao definido.
     */
    public static Optional<String> getTokenType() {
        return getClaim("type");
    }

    /**
     * Retorna o customerId do JWT atual quando presente e parseavel como UUID.
     *
     * Apenas tokens emitidos para customers carregam este claim — para tokens
     * de admin/staff sempre retorna {@link Optional#empty()}.
     */
    public static Optional<UUID> getCurrentCustomerId() {
        return getClaim("customerId").flatMap(SecurityContextHelper::parseUuidSafely);
    }

    /**
     * Retorna o userId (admin/staff) do JWT atual quando presente e parseavel.
     */
    public static Optional<UUID> getCurrentUserId() {
        return getClaim("userId").flatMap(SecurityContextHelper::parseUuidSafely);
    }

    private static Optional<UUID> parseUuidSafely(String raw) {
        try {
            return Optional.of(UUID.fromString(raw.trim()));
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }
    }
}
