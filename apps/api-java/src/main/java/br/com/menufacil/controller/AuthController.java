package br.com.menufacil.controller;

import br.com.menufacil.dto.LoginRequest;
import br.com.menufacil.dto.LoginResponse;
import br.com.menufacil.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Autenticação", description = "Endpoints de login e registro")
@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Login do administrador do estabelecimento")
    @PostMapping("/admin/login")
    public ResponseEntity<LoginResponse> adminLogin(
            @Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "X-Tenant-Slug", required = false) String tenantSlug,
            HttpServletResponse response) {

        if (request.getTenantSlug() == null && tenantSlug != null) {
            request.setTenantSlug(tenantSlug);
        }

        LoginResponse loginResponse = authService.adminLogin(request);

        // Setar cookies (compatível com NestJS)
        addCookie(response, "accessToken", loginResponse.getAccess_token(), 86400);
        addCookie(response, "refreshToken", loginResponse.getRefresh_token(), 604800);

        return ResponseEntity.ok(loginResponse);
    }

    @Operation(summary = "Health check da autenticação")
    @GetMapping("/check")
    public ResponseEntity<String> check() {
        return ResponseEntity.ok("OK");
    }

    private void addCookie(HttpServletResponse response, String name, String value, int maxAge) {
        Cookie cookie = new Cookie(name, value);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(maxAge);
        cookie.setAttribute("SameSite", "None");
        response.addCookie(cookie);
    }
}
