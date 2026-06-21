package br.com.menufacil.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Data;

/**
 * Resposta do endpoint POST /auth/refresh — entrega o novo access token.
 * O {@code refreshToken} retornado e o MESMO usado na requisicao (sem rotacao por enquanto).
 *
 * <p>Os nomes serializados ({@code access_token}/{@code refresh_token}) seguem o padrao
 * snake_case do contrato existente em {@link LoginResponse}.
 */
@Data
@Builder
public class RefreshTokenResponse {

    @JsonProperty("access_token")
    private String accessToken;

    @JsonProperty("refresh_token")
    private String refreshToken;
}
