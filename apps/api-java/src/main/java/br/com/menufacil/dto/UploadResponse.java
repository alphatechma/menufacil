package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UploadResponse {

    /**
     * URL pública do arquivo armazenado.
     */
    private String url;

    /**
     * Nome do arquivo gerado (UUID + extensão original).
     */
    private String filename;

    /**
     * Tamanho do arquivo em bytes.
     */
    private long size;
}
