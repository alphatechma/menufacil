package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ApplyReferralResponse {
    private boolean success;
    private String message;
}
