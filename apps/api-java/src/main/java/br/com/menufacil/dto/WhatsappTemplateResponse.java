package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WhatsappTemplateResponse {
    private String id;
    private String name;
    private String templateContent;
    private String variables;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
