package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReservationResponse {
    private String id;
    private String customerName;
    private String customerPhone;
    private int partySize;
    private String date;
    private String timeStart;
    private String tableId;
    private String status;
    private String notes;
    private String createdAt;
}
