package br.com.menufacil.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Tag(name = "Health", description = "Status do sistema")
@RestController
@RequestMapping("/health")
@RequiredArgsConstructor
public class HealthController {

    private final DataSource dataSource;

    @Operation(summary = "Health check")
    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> result = new LinkedHashMap<>();
        boolean dbOk = false;
        long dbLatency = -1;

        try (Connection conn = dataSource.getConnection()) {
            long start = System.currentTimeMillis();
            conn.createStatement().execute("SELECT 1");
            dbLatency = System.currentTimeMillis() - start;
            dbOk = true;
        } catch (Exception ignored) {}

        result.put("status", dbOk ? "ok" : "degraded");
        result.put("timestamp", LocalDateTime.now().toString());
        result.put("runtime", "spring-boot");
        result.put("database", Map.of(
                "connected", dbOk,
                "latency", dbLatency >= 0 ? dbLatency + "ms" : "error"
        ));
        result.put("memory", Map.of(
                "total", Runtime.getRuntime().totalMemory() / 1024 / 1024 + "MB",
                "free", Runtime.getRuntime().freeMemory() / 1024 / 1024 + "MB",
                "used", (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / 1024 / 1024 + "MB"
        ));

        return ResponseEntity.ok(result);
    }
}
