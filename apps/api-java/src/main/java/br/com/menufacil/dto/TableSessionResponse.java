package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TableSessionResponse {
    private String id;
    private String tableId;
    private String status;
    private String openedAt;
    private String closedAt;
    private String createdAt;
}
