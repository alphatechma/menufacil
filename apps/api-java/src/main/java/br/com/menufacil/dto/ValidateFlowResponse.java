package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ValidateFlowResponse {
    private boolean valid;
    private List<String> errors;
}
