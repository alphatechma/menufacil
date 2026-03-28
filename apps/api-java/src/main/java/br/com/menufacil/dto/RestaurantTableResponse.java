package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RestaurantTableResponse {
    private String id;
    private int number;
    private int capacity;
    private String status;
    private String qrCode;
    private int sortOrder;
    private String createdAt;
}
