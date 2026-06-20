package br.com.menufacil.dto;

import br.com.menufacil.domain.enums.WhatsappInstanceStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WhatsappInstanceResponse {
    private String id;
    private String instanceName;
    private WhatsappInstanceStatus status;
    private String phoneNumber;
    private String qrCode;
    private String unitId;
    private LocalDateTime createdAt;
}
