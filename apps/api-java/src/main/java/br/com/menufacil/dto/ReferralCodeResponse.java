package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ReferralCodeResponse {
    private String code;
}
