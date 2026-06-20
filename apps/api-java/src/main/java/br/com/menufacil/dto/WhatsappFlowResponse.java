package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class WhatsappFlowResponse {
    private String id;
    private String name;
    private String description;
    private String triggerType;
    private String triggerConfig;
    private String nodes;
    private String edges;
    private boolean active;
    private int priority;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
