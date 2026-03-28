package br.com.menufacil.domain.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @Value("${spring.profiles.active:dev}")
    private String activeProfile;

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        List<Map<String, String>> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> Map.of("field", e.getField(), "message", Objects.requireNonNull(e.getDefaultMessage())))
                .toList();
        return buildResponse(HttpStatus.BAD_REQUEST, "Dados inválidos", errors);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleStatus(ResponseStatusException ex) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        return buildResponse(status, ex.getReason() != null ? ex.getReason() : status.getReasonPhrase(), null);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        log.error("Erro não tratado: {}", ex.getMessage(), ex);
        String message = "dev".equals(activeProfile) ? ex.getMessage() : "Erro interno do servidor";
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, message, null);
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message, List<Map<String, String>> errors) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("statusCode", status.value());
        body.put("message", message);
        if (errors != null) body.put("errors", errors);
        body.put("timestamp", LocalDateTime.now().toString());
        return ResponseEntity.status(status).body(body);
    }
}
