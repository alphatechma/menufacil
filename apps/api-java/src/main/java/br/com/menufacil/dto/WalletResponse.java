package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class WalletResponse {
    private String id;
    private String customerId;
    private BigDecimal balance;
    private String createdAt;
}
