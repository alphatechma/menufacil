package br.com.menufacil.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
public class AuditLogStatsResponse {
    private long totalLogs;
    private Map<String, Long> byAction;
    private Map<String, Long> byEntityType;
    private List<DailyCount> byDay;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyCount {
        private String date;
        private long count;
    }
}
