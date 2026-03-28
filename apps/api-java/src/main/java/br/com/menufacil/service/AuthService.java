package br.com.menufacil.service;

import br.com.menufacil.config.security.JwtService;
import br.com.menufacil.domain.models.Tenant;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.dto.LoginRequest;
import br.com.menufacil.dto.LoginResponse;
import br.com.menufacil.repository.TenantRepository;
import br.com.menufacil.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;

    public LoginResponse adminLogin(LoginRequest request) {
        // Resolver tenant pelo slug
        String slug = request.getTenantSlug();
        if (slug == null || slug.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Slug do estabelecimento é obrigatório");
        }

        Tenant tenant = tenantRepository.findBySlugAndIsActiveTrue(slug)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Estabelecimento não encontrado"));

        // Buscar usuário por email e tenant
        User user = userRepository.findByEmailAndTenantId(request.getEmail(), tenant.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas"));

        // Verificar senha
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenciais inválidas");
        }

        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuário desativado");
        }

        // Gerar tokens JWT (compatível com NestJS)
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("system_role", user.getSystemRole().name());
        claims.put("tenant_id", tenant.getId().toString());
        claims.put("tenant_slug", tenant.getSlug());
        claims.put("type", "access");

        String accessToken = jwtService.generateAccessToken(user.getEmail(), claims);
        String refreshToken = jwtService.generateRefreshToken(user.getEmail());

        log.info("Login admin: {} no tenant {}", user.getEmail(), tenant.getSlug());

        return LoginResponse.builder()
                .user(LoginResponse.UserData.builder()
                        .id(user.getId().toString())
                        .name(user.getName())
                        .email(user.getEmail())
                        .system_role(user.getSystemRole().name())
                        .tenant_id(tenant.getId().toString())
                        .build())
                .access_token(accessToken)
                .refresh_token(refreshToken)
                .tenant_slug(tenant.getSlug())
                .modules(List.of()) // TODO: carregar módulos do plano
                .permissions(List.of()) // TODO: carregar permissões do role
                .plan(null) // TODO: carregar plano
                .build();
    }
}
