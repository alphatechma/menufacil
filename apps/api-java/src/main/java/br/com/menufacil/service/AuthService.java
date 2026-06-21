package br.com.menufacil.service;

import br.com.menufacil.config.security.JwtService;
import br.com.menufacil.domain.models.Customer;
import br.com.menufacil.domain.models.Permission;
import br.com.menufacil.domain.models.Role;
import br.com.menufacil.domain.models.Tenant;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.dto.CustomerAuthResponse;
import br.com.menufacil.dto.CustomerLoginByPhoneRequest;
import br.com.menufacil.dto.CustomerLoginRequest;
import br.com.menufacil.dto.CustomerRegisterRequest;
import br.com.menufacil.dto.LoginRequest;
import br.com.menufacil.dto.LoginResponse;
import br.com.menufacil.dto.RefreshTokenResponse;
import br.com.menufacil.repository.CustomerRepository;
import br.com.menufacil.repository.TenantRepository;
import br.com.menufacil.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuthService {

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final CustomerRepository customerRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

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

        // Carrega permissões granulares do role customizado (vazio se for super_admin/admin)
        List<String> permissions = extractPermissionKeys(user.getRole());

        // Gerar tokens JWT (compatível com NestJS)
        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId().toString());
        claims.put("system_role", user.getSystemRole().name());
        claims.put("tenant_id", tenant.getId().toString());
        claims.put("tenant_slug", tenant.getSlug());
        claims.put("type", "access");
        claims.put("permissions", permissions);

        String accessToken = jwtService.generateAccessToken(user.getEmail(), claims);

        // Refresh token carrega minimo necessario para identificar o user no /auth/refresh.
        // Permissoes/modulos NAO entram no refresh — sao recarregados a cada renovacao.
        Map<String, Object> refreshClaims = new HashMap<>();
        refreshClaims.put("userId", user.getId().toString());
        refreshClaims.put("tenant_id", tenant.getId().toString());
        refreshClaims.put("tenant_slug", tenant.getSlug());
        String refreshToken = jwtService.generateRefreshToken(user.getEmail(), refreshClaims);

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
                .permissions(permissions)
                .plan(null) // TODO: carregar plano
                .build();
    }

    private List<String> extractPermissionKeys(Role role) {
        if (role == null || role.getPermissions() == null || role.getPermissions().isEmpty()) {
            return List.of();
        }
        return role.getPermissions().stream()
                .map(Permission::getKey)
                .filter(Objects::nonNull)
                .filter(key -> !key.isBlank())
                .sorted()
                .toList();
    }

    // ----------------------------------------------------------------------
    // Customer (storefront) — autenticação
    // ----------------------------------------------------------------------

    /**
     * Login do cliente final por e-mail e senha.
     * Mensagens genéricas para não vazar existência de conta.
     */
    @Transactional
    public CustomerAuthResponse customerLogin(UUID tenantId, CustomerLoginRequest request) {
        Tenant tenant = requireTenant(tenantId);

        Customer customer = customerRepository
                .findByEmailAndTenantId(request.getEmail(), tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos"));

        if (customer.getPasswordHash() == null || customer.getPasswordHash().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Esta conta não possui senha. Entre pelo telefone e cadastre uma senha.");
        }

        if (!passwordEncoder.matches(request.getPassword(), customer.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-mail ou senha incorretos");
        }

        String accessToken = issueCustomerToken(customer, tenant);
        String refreshToken = issueCustomerRefreshToken(customer, tenant);
        log.info("Login customer (email): {} no tenant {}", customer.getEmail(), tenant.getSlug());

        recordCustomerAudit(tenant.getId(), customer, "login",
                Map.of("method", "email"));

        return toAuthResponse(customer, accessToken, refreshToken);
    }

    /**
     * Login simples por telefone (sem senha).
     * Caso não exista customer para o telefone informado, cria um novo automaticamente
     * (com apenas o telefone e o nome opcional do request).
     */
    @Transactional
    public CustomerAuthResponse customerLoginByPhone(UUID tenantId, CustomerLoginByPhoneRequest request) {
        Tenant tenant = requireTenant(tenantId);

        Optional<Customer> existing = customerRepository
                .findByPhoneAndTenantId(request.getPhone(), tenantId);

        Customer customer;
        boolean created = false;

        if (existing.isPresent()) {
            customer = existing.get();
            // Atualiza o nome se o request trouxer um novo (e o atual estiver vazio ou diferente).
            if (request.getName() != null && !request.getName().isBlank()
                    && !request.getName().equals(customer.getName())) {
                customer.setName(request.getName());
                customer = customerRepository.save(customer);
            }
        } else {
            customer = new Customer();
            customer.setPhone(request.getPhone());
            customer.setName(request.getName() != null && !request.getName().isBlank()
                    ? request.getName()
                    : request.getPhone());
            customer.setTenantId(tenantId);
            customer = customerRepository.save(customer);
            created = true;
            log.info("Customer criado via login por telefone: {} no tenant {}",
                    customer.getPhone(), tenant.getSlug());
        }

        String accessToken = issueCustomerToken(customer, tenant);
        String refreshToken = issueCustomerRefreshToken(customer, tenant);
        log.info("Login customer (telefone): {} no tenant {}", customer.getPhone(), tenant.getSlug());

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("method", "phone");
        details.put("created", created);
        recordCustomerAudit(tenant.getId(), customer, created ? "create" : "login", details);

        return toAuthResponse(customer, accessToken, refreshToken);
    }

    /**
     * Cadastro completo de cliente final (storefront).
     * Valida unicidade de e-mail e telefone dentro do tenant.
     */
    @Transactional
    public CustomerAuthResponse customerRegister(UUID tenantId, CustomerRegisterRequest request) {
        Tenant tenant = requireTenant(tenantId);

        customerRepository.findByEmailAndTenantId(request.getEmail(), tenantId)
                .ifPresent(c -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Este e-mail já está cadastrado");
                });

        customerRepository.findByPhoneAndTenantId(request.getPhone(), tenantId)
                .ifPresent(c -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT,
                            "Este telefone já está cadastrado");
                });

        Customer customer = new Customer();
        customer.setName(request.getName());
        customer.setPhone(request.getPhone());
        customer.setEmail(request.getEmail());
        customer.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        customer.setBirthDate(request.getBirthDate());
        customer.setGender(request.getGender());
        customer.setCpf(request.getCpf());
        customer.setTenantId(tenantId);

        customer = customerRepository.save(customer);
        log.info("Customer cadastrado: {} no tenant {}", customer.getEmail(), tenant.getSlug());

        Map<String, Object> details = new LinkedHashMap<>();
        details.put("name", customer.getName());
        details.put("email", customer.getEmail());
        details.put("phone", customer.getPhone());
        recordCustomerAudit(tenant.getId(), customer, "create", details);

        String accessToken = issueCustomerToken(customer, tenant);
        String refreshToken = issueCustomerRefreshToken(customer, tenant);
        return toAuthResponse(customer, accessToken, refreshToken);
    }

    // ----------------------------------------------------------------------
    // Helpers — customer
    // ----------------------------------------------------------------------

    private Tenant requireTenant(UUID tenantId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Tenant é obrigatório para autenticação de cliente");
        }
        return tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Estabelecimento não encontrado"));
    }

    private CustomerAuthResponse toAuthResponse(Customer customer, String accessToken, String refreshToken) {
        return CustomerAuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .customer(CustomerAuthResponse.CustomerData.builder()
                        .id(customer.getId() != null ? customer.getId().toString() : null)
                        .name(customer.getName())
                        .email(customer.getEmail())
                        .phone(customer.getPhone())
                        .birthDate(customer.getBirthDate())
                        .gender(customer.getGender())
                        .cpf(customer.getCpf())
                        .loyaltyPoints(customer.getLoyaltyPoints())
                        .build())
                .build();
    }

    private void recordCustomerAudit(UUID tenantId, Customer customer, String action,
                                     Map<String, Object> details) {
        try {
            String detailsJson = serializeDetails(details);
            auditLogService.log(
                    tenantId,
                    null, // customer não é user — userId fica nulo
                    customer.getEmail() != null ? customer.getEmail() : customer.getPhone(),
                    action,
                    "customer",
                    customer.getId(),
                    customer.getName(),
                    detailsJson,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de cliente (action={}): {}", action, e.getMessage());
        }
    }

    private String serializeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception e) {
            return details.toString();
        }
    }

    private String getCurrentIpAddress() {
        try {
            ServletRequestAttributes attrs = (ServletRequestAttributes)
                    RequestContextHolder.getRequestAttributes();
            if (attrs != null) {
                HttpServletRequest req = attrs.getRequest();
                String forwarded = req.getHeader("X-Forwarded-For");
                if (forwarded != null && !forwarded.isBlank()) {
                    return forwarded.split(",")[0].trim();
                }
                return req.getRemoteAddr();
            }
        } catch (Exception ignored) {}
        return null;
    }

    // ----------------------------------------------------------------------
    // Customer (storefront) token issuance
    // ----------------------------------------------------------------------

    /**
     * Emite um access token para um customer (cliente final do storefront).
     *
     * Este e o ponto canonico de emissao de JWT para customers — qualquer fluxo
     * (customerLogin por email/senha, customerLoginByPhone, registerCustomer)
     * deve chamar este metodo para garantir que o claim {@code customerId} e o
     * claim {@code type=customer} estejam sempre presentes.
     *
     * @param customer entidade Customer ja persistida (id obrigatorio)
     * @param tenant   tenant ao qual o customer pertence
     * @return JWT assinado
     */
    public String issueCustomerToken(Customer customer, Tenant tenant) {
        if (customer == null || customer.getId() == null) {
            throw new IllegalArgumentException("Customer com id e obrigatorio para emitir token");
        }
        if (tenant == null || tenant.getId() == null) {
            throw new IllegalArgumentException("Tenant com id e obrigatorio para emitir token de customer");
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("tenant_id", tenant.getId().toString());
        claims.put("tenant_slug", tenant.getSlug());
        if (customer.getName() != null) {
            claims.put("name", customer.getName());
        }
        if (customer.getEmail() != null) {
            claims.put("email", customer.getEmail());
        }
        if (customer.getPhone() != null) {
            claims.put("phone", customer.getPhone());
        }

        // subject: prefere email, cai para phone, depois para customerId.
        String subject = customer.getEmail();
        if (subject == null || subject.isBlank()) {
            subject = customer.getPhone();
        }
        if (subject == null || subject.isBlank()) {
            subject = customer.getId().toString();
        }

        return jwtService.generateCustomerAccessToken(customer.getId().toString(), subject, claims);
    }

    /**
     * Emite um refresh token para um customer. Carrega tenant_id/tenant_slug
     * para que /auth/refresh saiba resolver o tenant atual sem depender do header.
     */
    public String issueCustomerRefreshToken(Customer customer, Tenant tenant) {
        if (customer == null || customer.getId() == null) {
            throw new IllegalArgumentException("Customer com id e obrigatorio para emitir refresh token");
        }
        if (tenant == null || tenant.getId() == null) {
            throw new IllegalArgumentException("Tenant com id e obrigatorio para emitir refresh token de customer");
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("tenant_id", tenant.getId().toString());
        claims.put("tenant_slug", tenant.getSlug());

        String subject = customer.getEmail();
        if (subject == null || subject.isBlank()) {
            subject = customer.getPhone();
        }
        if (subject == null || subject.isBlank()) {
            subject = customer.getId().toString();
        }

        return jwtService.generateCustomerRefreshToken(customer.getId().toString(), subject, claims);
    }

    // ----------------------------------------------------------------------
    // Refresh flow — admin + customer
    // ----------------------------------------------------------------------

    /**
     * Renova o access token a partir de um refresh token valido.
     *
     * <p>Detecta automaticamente se o refresh e de admin ou de customer via claim
     * {@code subject_type} e emite um novo access token apropriado. O refresh
     * token retornado e o MESMO recebido (sem rotacao por enquanto — TODO).
     *
     * <p>Falhas:
     * <ul>
     *   <li>Token invalido / expirado / nao-refresh -> 401 (via {@link JwtService#parseRefreshToken})</li>
     *   <li>User/customer nao encontrado -> 401</li>
     *   <li>User desativado -> 403</li>
     * </ul>
     *
     * @param refreshToken refresh token recebido no body
     * @return {@link RefreshTokenResponse} com o novo access token (e o mesmo refresh)
     */
    public RefreshTokenResponse refreshAccessToken(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Refresh token e obrigatorio");
        }

        Claims claims = jwtService.parseRefreshToken(refreshToken);
        String subjectType = claims.get(JwtService.CLAIM_SUBJECT_TYPE, String.class);

        // Compatibilidade: refresh tokens emitidos antes desta feature nao carregam
        // subject_type. Tratamos como admin para nao quebrar sessoes ativas.
        if (subjectType == null || subjectType.isBlank()) {
            subjectType = JwtService.SUBJECT_TYPE_ADMIN;
        }

        if (JwtService.SUBJECT_TYPE_CUSTOMER.equals(subjectType)) {
            return refreshCustomerAccessToken(claims, refreshToken);
        }
        return refreshAdminAccessToken(claims, refreshToken);
    }

    private RefreshTokenResponse refreshAdminAccessToken(Claims claims, String refreshToken) {
        String email = claims.getSubject();
        String tenantIdStr = claims.get("tenant_id", String.class);

        if (email == null || email.isBlank() || tenantIdStr == null || tenantIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalido");
        }

        UUID tenantId;
        try {
            tenantId = UUID.fromString(tenantIdStr);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalido");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Estabelecimento nao encontrado"));

        User user = userRepository.findByEmailAndTenantId(email, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Usuario nao encontrado"));

        if (!user.isActive()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Usuario desativado");
        }

        List<String> permissions = extractPermissionKeys(user.getRole());

        Map<String, Object> accessClaims = new HashMap<>();
        accessClaims.put("userId", user.getId().toString());
        accessClaims.put("system_role", user.getSystemRole().name());
        accessClaims.put("tenant_id", tenant.getId().toString());
        accessClaims.put("tenant_slug", tenant.getSlug());
        accessClaims.put("type", JwtService.TYPE_ACCESS);
        accessClaims.put("permissions", permissions);

        String newAccessToken = jwtService.generateAccessToken(user.getEmail(), accessClaims);
        log.info("Refresh admin token: {} no tenant {}", user.getEmail(), tenant.getSlug());

        // TODO: rotacionar refresh token + manter blacklist do antigo.
        return RefreshTokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .build();
    }

    private RefreshTokenResponse refreshCustomerAccessToken(Claims claims, String refreshToken) {
        String customerIdStr = claims.get("customerId", String.class);
        String tenantIdStr = claims.get("tenant_id", String.class);

        if (customerIdStr == null || customerIdStr.isBlank()
                || tenantIdStr == null || tenantIdStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalido");
        }

        UUID customerId;
        UUID tenantId;
        try {
            customerId = UUID.fromString(customerIdStr);
            tenantId = UUID.fromString(tenantIdStr);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalido");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Estabelecimento nao encontrado"));

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                        "Cliente nao encontrado"));

        // Garante que o customer ainda pertence ao tenant do refresh (defesa em profundidade).
        if (customer.getTenantId() == null || !customer.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Refresh token invalido");
        }

        String newAccessToken = issueCustomerToken(customer, tenant);
        log.info("Refresh customer token: {} no tenant {}",
                customer.getEmail() != null ? customer.getEmail() : customer.getPhone(),
                tenant.getSlug());

        // TODO: rotacionar refresh token + manter blacklist do antigo.
        return RefreshTokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshToken)
                .build();
    }
}
