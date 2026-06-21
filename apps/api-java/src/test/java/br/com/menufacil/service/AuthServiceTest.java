package br.com.menufacil.service;

import br.com.menufacil.config.security.JwtService;
import br.com.menufacil.domain.enums.UserRole;
import br.com.menufacil.domain.models.Customer;
import br.com.menufacil.domain.models.Tenant;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.dto.CustomerAuthResponse;
import br.com.menufacil.dto.CustomerLoginByPhoneRequest;
import br.com.menufacil.dto.CustomerLoginRequest;
import br.com.menufacil.dto.CustomerRegisterRequest;
import br.com.menufacil.dto.RefreshTokenResponse;
import br.com.menufacil.repository.CustomerRepository;
import br.com.menufacil.repository.TenantRepository;
import br.com.menufacil.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuditLogService auditLogService;

    // JwtService nao e mockado — usamos o real para verificar o conteudo do token emitido.
    private JwtService jwtService;

    private AuthService authService;

    private UUID tenantId;
    private Tenant tenant;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        // Secret base64 de 256 bits (32 bytes) — suficiente para HS256.
        ReflectionTestUtils.setField(jwtService, "secret",
                "dGVzdC1zZWNyZXQta2V5LW1pbmltdW0tMzItYnl0ZXMtbG9uZy0xMjM0NTY=");
        ReflectionTestUtils.setField(jwtService, "accessExpiration", 3_600_000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", 86_400_000L);

        authService = new AuthService(
                userRepository,
                tenantRepository,
                customerRepository,
                jwtService,
                passwordEncoder,
                auditLogService);

        tenantId = UUID.randomUUID();
        tenant = new Tenant();
        tenant.setId(tenantId);
        tenant.setName("Restaurante Teste");
        tenant.setSlug("teste");
    }

    // ------------------------------------------------------------------
    // issueCustomerToken (já existente)
    // ------------------------------------------------------------------

    @Test
    void issueCustomerToken_deveIncluirClaimCustomerIdETypeCustomer() {
        // Arrange
        Customer customer = new Customer();
        ReflectionTestUtils.setField(customer, "id", UUID.randomUUID());
        customer.setTenantId(tenant.getId());
        customer.setName("Fulano");
        customer.setEmail("fulano@example.com");
        customer.setPhone("+5511999999999");

        // Act
        String token = authService.issueCustomerToken(customer, tenant);

        // Assert
        assertThat(token).isNotBlank();
        Claims claims = jwtService.extractAllClaims(token);

        assertThat(claims.get("customerId", String.class))
                .as("JWT de customer deve carregar o claim customerId")
                .isEqualTo(customer.getId().toString());

        assertThat(claims.get("type", String.class))
                .as("JWT de customer deve marcar type=customer")
                .isEqualTo("customer");

        assertThat(claims.get("tenant_id", String.class)).isEqualTo(tenant.getId().toString());
        assertThat(claims.get("tenant_slug", String.class)).isEqualTo("teste");
        assertThat(claims.get("name", String.class)).isEqualTo("Fulano");
        assertThat(claims.get("email", String.class)).isEqualTo("fulano@example.com");

        // Subject prefere email
        assertThat(claims.getSubject()).isEqualTo("fulano@example.com");
    }

    @Test
    void issueCustomerToken_subjectCaiParaPhoneSeEmailAusente() {
        // Arrange
        Customer customer = new Customer();
        ReflectionTestUtils.setField(customer, "id", UUID.randomUUID());
        customer.setName("Sem Email");
        customer.setPhone("+5511988888888");
        // email = null

        // Act
        String token = authService.issueCustomerToken(customer, tenant);

        // Assert
        Claims claims = jwtService.extractAllClaims(token);
        assertThat(claims.getSubject()).isEqualTo("+5511988888888");
        assertThat(claims.get("customerId", String.class)).isEqualTo(customer.getId().toString());
        assertThat(claims.get("type", String.class)).isEqualTo("customer");
    }

    @Test
    void issueCustomerToken_subjectCaiParaCustomerIdSeEmailEPhoneAusentes() {
        // Arrange
        Customer customer = new Customer();
        ReflectionTestUtils.setField(customer, "id", UUID.randomUUID());
        customer.setName("Anonimo");

        // Act
        String token = authService.issueCustomerToken(customer, tenant);

        // Assert
        Claims claims = jwtService.extractAllClaims(token);
        assertThat(claims.getSubject()).isEqualTo(customer.getId().toString());
    }

    @Test
    void issueCustomerToken_falhaSemCustomerOuId() {
        assertThatThrownBy(() -> authService.issueCustomerToken(null, tenant))
                .isInstanceOf(IllegalArgumentException.class);

        Customer semId = new Customer();
        assertThatThrownBy(() -> authService.issueCustomerToken(semId, tenant))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void issueCustomerToken_falhaSemTenant() {
        Customer customer = new Customer();
        ReflectionTestUtils.setField(customer, "id", UUID.randomUUID());

        assertThatThrownBy(() -> authService.issueCustomerToken(customer, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void jwtDeAdminNaoDeveTerCustomerId() {
        // Verifica que o token gerado via API de admin (generateAccessToken) NAO carrega customerId,
        // ou seja, o claim e exclusivo do fluxo de customer.
        var claimsMap = new java.util.HashMap<String, Object>();
        claimsMap.put("userId", UUID.randomUUID().toString());
        claimsMap.put("system_role", "ADMIN");
        claimsMap.put("type", "access");

        String token = jwtService.generateAccessToken("admin@x.com", claimsMap);
        Claims claims = jwtService.extractAllClaims(token);

        assertThat(claims.get("customerId", String.class)).isNull();
        assertThat(claims.get("type", String.class)).isEqualTo("access");
        assertThat(claims.get("system_role", String.class)).isEqualTo("ADMIN");
    }

    // ------------------------------------------------------------------
    // customerLogin (email + senha)
    // ------------------------------------------------------------------

    @Test
    void customerLogin_deveAutenticarComCredenciaisValidas() {
        // Arrange
        Customer customer = buildPersistedCustomer("ana@example.com", "+5511900000001");
        customer.setPasswordHash("$2a$10$hashvalido");

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findByEmailAndTenantId("ana@example.com", tenantId))
                .thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("senha-correta", customer.getPasswordHash())).thenReturn(true);

        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setEmail("ana@example.com");
        request.setPassword("senha-correta");

        // Act
        CustomerAuthResponse response = authService.customerLogin(tenantId, request);

        // Assert
        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getCustomer().getEmail()).isEqualTo("ana@example.com");
        Claims claims = jwtService.extractAllClaims(response.getAccessToken());
        assertThat(claims.get("customerId", String.class)).isEqualTo(customer.getId().toString());
        assertThat(claims.get("type", String.class)).isEqualTo("customer");

        verify(auditLogService).log(any(), any(), anyString(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void customerLogin_deveLancarUnauthorizedQuandoSenhaInvalida() {
        // Arrange
        Customer customer = buildPersistedCustomer("ana@example.com", "+5511900000001");
        customer.setPasswordHash("$2a$10$hashvalido");

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findByEmailAndTenantId("ana@example.com", tenantId))
                .thenReturn(Optional.of(customer));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setEmail("ana@example.com");
        request.setPassword("senha-errada");

        // Act + Assert
        assertThatThrownBy(() -> authService.customerLogin(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void customerLogin_deveLancarUnauthorizedQuandoEmailNaoEncontrado() {
        // Arrange
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findByEmailAndTenantId(anyString(), any()))
                .thenReturn(Optional.empty());

        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setEmail("inexistente@example.com");
        request.setPassword("qualquer");

        // Act + Assert
        assertThatThrownBy(() -> authService.customerLogin(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void customerLogin_deveLancarBadRequestQuandoContaSemSenha() {
        // Arrange — customer criado via phone-login não tem passwordHash
        Customer customer = buildPersistedCustomer("ana@example.com", "+5511900000001");
        customer.setPasswordHash(null);

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findByEmailAndTenantId("ana@example.com", tenantId))
                .thenReturn(Optional.of(customer));

        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setEmail("ana@example.com");
        request.setPassword("qualquer");

        // Act + Assert
        assertThatThrownBy(() -> authService.customerLogin(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ------------------------------------------------------------------
    // customerLoginByPhone
    // ------------------------------------------------------------------

    @Test
    void customerLoginByPhone_deveAutenticarCustomerExistente() {
        // Arrange
        Customer existente = buildPersistedCustomer("antigo@example.com", "+5511900000099");
        existente.setName("Antigo");

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findByPhoneAndTenantId("+5511900000099", tenantId))
                .thenReturn(Optional.of(existente));

        CustomerLoginByPhoneRequest request = new CustomerLoginByPhoneRequest();
        request.setPhone("+5511900000099");

        // Act
        CustomerAuthResponse response = authService.customerLoginByPhone(tenantId, request);

        // Assert
        assertThat(response.getCustomer().getId()).isEqualTo(existente.getId().toString());
        assertThat(response.getAccessToken()).isNotBlank();
        // Não cria — não chama save quando nome não mudou
        verify(customerRepository, never()).save(any());
    }

    @Test
    void customerLoginByPhone_deveCriarNovoCustomerQuandoTelefoneNaoExiste() {
        // Arrange
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findByPhoneAndTenantId("+5511911112222", tenantId))
                .thenReturn(Optional.empty());

        // Simula que ao salvar, o customer recebe um id e um tenant_id.
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> {
            Customer c = invocation.getArgument(0);
            if (c.getId() == null) {
                ReflectionTestUtils.setField(c, "id", UUID.randomUUID());
            }
            return c;
        });

        CustomerLoginByPhoneRequest request = new CustomerLoginByPhoneRequest();
        request.setPhone("+5511911112222");
        request.setName("Novo Cliente");

        // Act
        CustomerAuthResponse response = authService.customerLoginByPhone(tenantId, request);

        // Assert
        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        Customer salvo = captor.getValue();
        assertThat(salvo.getPhone()).isEqualTo("+5511911112222");
        assertThat(salvo.getName()).isEqualTo("Novo Cliente");
        assertThat(salvo.getTenantId()).isEqualTo(tenantId);

        assertThat(response.getCustomer().getPhone()).isEqualTo("+5511911112222");
        assertThat(response.getAccessToken()).isNotBlank();
    }

    // ------------------------------------------------------------------
    // customerRegister
    // ------------------------------------------------------------------

    @Test
    void customerRegister_deveCadastrarCustomerEEmitirToken() {
        // Arrange
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findByEmailAndTenantId(anyString(), any()))
                .thenReturn(Optional.empty());
        when(customerRepository.findByPhoneAndTenantId(anyString(), any()))
                .thenReturn(Optional.empty());
        when(passwordEncoder.encode("senha123")).thenReturn("$2a$10$hashfake");
        when(customerRepository.save(any(Customer.class))).thenAnswer(invocation -> {
            Customer c = invocation.getArgument(0);
            ReflectionTestUtils.setField(c, "id", UUID.randomUUID());
            return c;
        });

        CustomerRegisterRequest request = new CustomerRegisterRequest();
        request.setName("Bia");
        request.setEmail("bia@example.com");
        request.setPhone("+5511988887777");
        request.setPassword("senha123");
        request.setBirthDate(LocalDate.of(1990, 1, 1));
        request.setGender("F");
        request.setCpf("000.000.000-00");

        // Act
        CustomerAuthResponse response = authService.customerRegister(tenantId, request);

        // Assert
        ArgumentCaptor<Customer> captor = ArgumentCaptor.forClass(Customer.class);
        verify(customerRepository).save(captor.capture());
        Customer salvo = captor.getValue();
        assertThat(salvo.getEmail()).isEqualTo("bia@example.com");
        assertThat(salvo.getPasswordHash()).isEqualTo("$2a$10$hashfake");
        assertThat(salvo.getBirthDate()).isEqualTo(LocalDate.of(1990, 1, 1));
        assertThat(salvo.getTenantId()).isEqualTo(tenantId);

        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getCustomer().getEmail()).isEqualTo("bia@example.com");

        verify(auditLogService).log(any(), any(), anyString(), any(), any(), any(), any(), any(), any());
    }

    @Test
    void customerRegister_deveLancarConflictQuandoEmailDuplicado() {
        // Arrange
        Customer existente = buildPersistedCustomer("bia@example.com", "+5511900000123");
        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findByEmailAndTenantId("bia@example.com", tenantId))
                .thenReturn(Optional.of(existente));

        CustomerRegisterRequest request = new CustomerRegisterRequest();
        request.setName("Bia");
        request.setEmail("bia@example.com");
        request.setPhone("+5511900000124");
        request.setPassword("senha123");

        // Act + Assert
        assertThatThrownBy(() -> authService.customerRegister(tenantId, request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);

        verify(customerRepository, never()).save(any());
    }

    // ------------------------------------------------------------------
    // refreshAccessToken — admin
    // ------------------------------------------------------------------

    @Test
    void refreshAccessToken_adminTokenValidoDeveEmitirNovoAccess() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User user = new User();
        ReflectionTestUtils.setField(user, "id", userId);
        user.setEmail("admin@example.com");
        user.setName("Admin");
        user.setSystemRole(UserRole.admin);
        user.setActive(true);

        java.util.Map<String, Object> refreshClaims = new java.util.HashMap<>();
        refreshClaims.put("userId", userId.toString());
        refreshClaims.put("tenant_id", tenantId.toString());
        refreshClaims.put("tenant_slug", tenant.getSlug());
        String refreshToken = jwtService.generateRefreshToken("admin@example.com", refreshClaims);

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(userRepository.findByEmailAndTenantId("admin@example.com", tenantId))
                .thenReturn(Optional.of(user));

        // Act
        RefreshTokenResponse response = authService.refreshAccessToken(refreshToken);

        // Assert
        assertThat(response.getAccessToken()).isNotBlank();
        assertThat(response.getRefreshToken())
                .as("Refresh token retornado deve ser o MESMO (sem rotacao por enquanto)")
                .isEqualTo(refreshToken);

        Claims newAccess = jwtService.extractAllClaims(response.getAccessToken());
        assertThat(newAccess.get("type", String.class)).isEqualTo(JwtService.TYPE_ACCESS);
        assertThat(newAccess.get("userId", String.class)).isEqualTo(userId.toString());
        assertThat(newAccess.get("system_role", String.class)).isEqualTo("admin");
        assertThat(newAccess.get("tenant_id", String.class)).isEqualTo(tenantId.toString());
        assertThat(newAccess.getSubject()).isEqualTo("admin@example.com");
    }

    @Test
    void refreshAccessToken_deveLancar401QuandoTokenExpirado() {
        // Arrange — refresh emitido ja expirado
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", -1_000L);
        String expirado = jwtService.generateRefreshToken("admin@example.com",
                java.util.Map.of("userId", UUID.randomUUID().toString(),
                                 "tenant_id", tenantId.toString()));
        // Restaura para nao contaminar outros testes.
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", 86_400_000L);

        // Act + Assert
        assertThatThrownBy(() -> authService.refreshAccessToken(expirado))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refreshAccessToken_deveLancar401QuandoAccessTokenForUsadoComoRefresh() {
        // Arrange — emite access token de admin
        java.util.Map<String, Object> claims = new java.util.HashMap<>();
        claims.put("userId", UUID.randomUUID().toString());
        claims.put("type", JwtService.TYPE_ACCESS);
        String accessToken = jwtService.generateAccessToken("admin@example.com", claims);

        // Act + Assert
        assertThatThrownBy(() -> authService.refreshAccessToken(accessToken))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refreshAccessToken_deveLancar403QuandoUsuarioDesativado() {
        // Arrange
        UUID userId = UUID.randomUUID();
        User user = new User();
        ReflectionTestUtils.setField(user, "id", userId);
        user.setEmail("admin@example.com");
        user.setSystemRole(UserRole.admin);
        user.setActive(false); // desativado

        java.util.Map<String, Object> refreshClaims = new java.util.HashMap<>();
        refreshClaims.put("userId", userId.toString());
        refreshClaims.put("tenant_id", tenantId.toString());
        refreshClaims.put("tenant_slug", tenant.getSlug());
        String refreshToken = jwtService.generateRefreshToken("admin@example.com", refreshClaims);

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(userRepository.findByEmailAndTenantId("admin@example.com", tenantId))
                .thenReturn(Optional.of(user));

        // Act + Assert
        assertThatThrownBy(() -> authService.refreshAccessToken(refreshToken))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void refreshAccessToken_deveLancar401QuandoUsuarioNaoExisteMais() {
        // Arrange
        UUID userId = UUID.randomUUID();
        java.util.Map<String, Object> refreshClaims = new java.util.HashMap<>();
        refreshClaims.put("userId", userId.toString());
        refreshClaims.put("tenant_id", tenantId.toString());
        refreshClaims.put("tenant_slug", tenant.getSlug());
        String refreshToken = jwtService.generateRefreshToken("admin@example.com", refreshClaims);

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(userRepository.findByEmailAndTenantId("admin@example.com", tenantId))
                .thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> authService.refreshAccessToken(refreshToken))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    // ------------------------------------------------------------------
    // refreshAccessToken — customer
    // ------------------------------------------------------------------

    @Test
    void refreshAccessToken_customerTokenValidoDeveEmitirNovoAccessCustomer() {
        // Arrange
        Customer customer = buildPersistedCustomer("ana@example.com", "+5511900000001");

        java.util.Map<String, Object> refreshClaims = new java.util.HashMap<>();
        refreshClaims.put("tenant_id", tenantId.toString());
        refreshClaims.put("tenant_slug", tenant.getSlug());
        String refreshToken = jwtService.generateCustomerRefreshToken(
                customer.getId().toString(), "ana@example.com", refreshClaims);

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findById(customer.getId())).thenReturn(Optional.of(customer));

        // Act
        RefreshTokenResponse response = authService.refreshAccessToken(refreshToken);

        // Assert
        Claims newAccess = jwtService.extractAllClaims(response.getAccessToken());
        assertThat(newAccess.get("type", String.class)).isEqualTo(JwtService.TYPE_CUSTOMER);
        assertThat(newAccess.get("customerId", String.class)).isEqualTo(customer.getId().toString());
        assertThat(newAccess.get("tenant_id", String.class)).isEqualTo(tenantId.toString());
        assertThat(response.getRefreshToken()).isEqualTo(refreshToken);
    }

    @Test
    void refreshAccessToken_customerDeveLancar401QuandoTenantNaoBate() {
        // Arrange — customer pertence a outro tenant
        Customer customer = buildPersistedCustomer("ana@example.com", "+5511900000001");
        UUID outroTenantId = UUID.randomUUID();
        customer.setTenantId(outroTenantId);

        java.util.Map<String, Object> refreshClaims = new java.util.HashMap<>();
        refreshClaims.put("tenant_id", tenantId.toString());
        refreshClaims.put("tenant_slug", tenant.getSlug());
        String refreshToken = jwtService.generateCustomerRefreshToken(
                customer.getId().toString(), "ana@example.com", refreshClaims);

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findById(customer.getId())).thenReturn(Optional.of(customer));

        // Act + Assert
        assertThatThrownBy(() -> authService.refreshAccessToken(refreshToken))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void refreshAccessToken_deveLancarBadRequestQuandoTokenVazio() {
        assertThatThrownBy(() -> authService.refreshAccessToken(null))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        assertThatThrownBy(() -> authService.refreshAccessToken(""))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    // ------------------------------------------------------------------
    // Refresh emitido no login — sanity check
    // ------------------------------------------------------------------

    @Test
    void customerLogin_deveRetornarRefreshTokenNaResposta() {
        // Arrange
        Customer customer = buildPersistedCustomer("ana@example.com", "+5511900000001");
        customer.setPasswordHash("$2a$10$hashvalido");

        when(tenantRepository.findById(tenantId)).thenReturn(Optional.of(tenant));
        when(customerRepository.findByEmailAndTenantId("ana@example.com", tenantId))
                .thenReturn(Optional.of(customer));
        when(passwordEncoder.matches("senha-correta", customer.getPasswordHash())).thenReturn(true);

        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setEmail("ana@example.com");
        request.setPassword("senha-correta");

        // Act
        CustomerAuthResponse response = authService.customerLogin(tenantId, request);

        // Assert
        assertThat(response.getRefreshToken())
                .as("Customer login agora retorna refresh token")
                .isNotBlank();

        Claims refreshClaims = jwtService.extractAllClaims(response.getRefreshToken());
        assertThat(refreshClaims.get(JwtService.CLAIM_TYPE, String.class)).isEqualTo(JwtService.TYPE_REFRESH);
        assertThat(refreshClaims.get(JwtService.CLAIM_SUBJECT_TYPE, String.class)).isEqualTo(JwtService.SUBJECT_TYPE_CUSTOMER);
        assertThat(refreshClaims.get("customerId", String.class)).isEqualTo(customer.getId().toString());
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    private Customer buildPersistedCustomer(String email, String phone) {
        Customer customer = new Customer();
        ReflectionTestUtils.setField(customer, "id", UUID.randomUUID());
        customer.setTenantId(tenantId);
        customer.setName("Cliente");
        customer.setEmail(email);
        customer.setPhone(phone);
        return customer;
    }
}
