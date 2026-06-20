package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TestFlowResponse {
    private String executionId;
    private String status;
}
