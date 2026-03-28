package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class WalletTransactionResponse {
    private String id;
    private String walletId;
    private String type;
    private BigDecimal amount;
    private String description;
    private String orderId;
    private String createdAt;
}
