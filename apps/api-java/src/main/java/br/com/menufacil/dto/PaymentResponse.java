package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PaymentResponse {
    private String id;
    private String orderId;
    private String method;
    private String externalId;
    private String status;
    private BigDecimal amount;
    private String pixQrCode;
    private String pixCopyPaste;
    private String createdAt;
    private String updatedAt;
}
