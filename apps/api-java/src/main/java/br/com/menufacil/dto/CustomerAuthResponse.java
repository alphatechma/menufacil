package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

/**
 * Resposta padrão dos endpoints de autenticação de cliente (storefront).
 * O campo {@code refreshToken} está presente para compatibilidade com o cliente NestJS,
 * mas pode vir nulo até o fluxo de refresh ser portado.
 */
@Data
@Builder
public class CustomerAuthResponse {

    private String accessToken;
    private String refreshToken;
    private CustomerData customer;

    @Data
    @Builder
    public static class CustomerData {
        private String id;
        private String name;
        private String email;
        private String phone;
        private LocalDate birthDate;
        private String gender;
        private String cpf;
        private int loyaltyPoints;
    }
}
