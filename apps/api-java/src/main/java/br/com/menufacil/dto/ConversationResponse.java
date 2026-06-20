package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ConversationResponse {
    private String phone;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private Long unread;
}
