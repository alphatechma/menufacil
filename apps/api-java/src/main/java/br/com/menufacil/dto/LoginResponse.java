package br.com.menufacil.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class LoginResponse {
    private UserData user;
    private String access_token;
    private String refresh_token;
    private String tenant_slug;
    private List<String> modules;
    private List<String> permissions;
    private PlanData plan;

    @Data
    @Builder
    public static class UserData {
        private String id;
        private String name;
        private String email;
        private String system_role;
        private String tenant_id;
    }

    @Data
    @Builder
    public static class PlanData {
        private String id;
        private String name;
    }
}
