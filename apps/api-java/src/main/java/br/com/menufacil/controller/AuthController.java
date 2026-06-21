package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CustomerAuthResponse;
import br.com.menufacil.dto.CustomerLoginByPhoneRequest;
import br.com.menufacil.dto.CustomerLoginRequest;
import br.com.menufacil.dto.CustomerRegisterRequest;
import br.com.menufacil.dto.LoginRequest;
import br.com.menufacil.dto.LoginResponse;
import br.com.menufacil.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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

    @Operation(summary = "Login do cliente final por e-mail e senha")
    @PostMapping("/customer/login")
    public ResponseEntity<CustomerAuthResponse> customerLogin(
            @Valid @RequestBody CustomerLoginRequest request,
            HttpServletResponse response) {

        CustomerAuthResponse authResponse =
                authService.customerLogin(TenantContext.getRequiredTenantUUID(), request);

        addCookie(response, "customer_token", authResponse.getAccessToken(), 86400);
        return ResponseEntity.ok(authResponse);
    }

    @Operation(summary = "Login simples do cliente final por telefone (cria conta se não existir)")
    @PostMapping("/customer/login-phone")
    public ResponseEntity<CustomerAuthResponse> customerLoginByPhone(
            @Valid @RequestBody CustomerLoginByPhoneRequest request,
            HttpServletResponse response) {

        CustomerAuthResponse authResponse =
                authService.customerLoginByPhone(TenantContext.getRequiredTenantUUID(), request);

        addCookie(response, "customer_token", authResponse.getAccessToken(), 86400);
        return ResponseEntity.ok(authResponse);
    }

    @Operation(summary = "Cadastro de cliente final do estabelecimento")
    @PostMapping("/customer/register")
    public ResponseEntity<CustomerAuthResponse> customerRegister(
            @Valid @RequestBody CustomerRegisterRequest request,
            HttpServletResponse response) {

        CustomerAuthResponse authResponse =
                authService.customerRegister(TenantContext.getRequiredTenantUUID(), request);

        addCookie(response, "customer_token", authResponse.getAccessToken(), 86400);
        return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
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
