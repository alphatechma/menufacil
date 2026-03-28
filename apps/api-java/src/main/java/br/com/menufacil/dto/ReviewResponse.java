package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReviewResponse {
    private String id;
    private String orderId;
    private String customerId;
    private int rating;
    private String comment;
    private String reply;
    private String repliedAt;
    private String createdAt;
}
