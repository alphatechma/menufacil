package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NotificationResponse {
    private String id;
    private String orderId;
    private String channel;
    private String status;
    private LocalDateTime sentAt;
    private String recipient;
    private LocalDateTime createdAt;
}
