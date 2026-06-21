package br.com.menufacil.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Body do endpoint POST /auth/refresh — recebe o refresh token emitido no login.
 */
@Data
public class RefreshTokenRequest {

    @NotBlank(message = "refreshToken e obrigatorio")
    private String refreshToken;
}
