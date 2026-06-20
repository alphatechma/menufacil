package br.com.menufacil.dto;

import br.com.menufacil.domain.enums.WhatsappMessageDirection;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WhatsappMessageResponse {
    private String id;
    private String instanceId;
    private String phone;
    private WhatsappMessageDirection direction;
    private String content;
    private String templateUsed;
    private boolean delivered;
    private LocalDateTime createdAt;
}
