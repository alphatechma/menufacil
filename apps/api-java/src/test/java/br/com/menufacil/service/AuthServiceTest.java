package br.com.menufacil.service;

import br.com.menufacil.config.security.JwtService;
import br.com.menufacil.domain.models.Customer;
import br.com.menufacil.domain.models.Tenant;
import br.com.menufacil.repository.CustomerRepository;
import br.com.menufacil.repository.TenantRepository;
import br.com.menufacil.repository.UserRepository;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private TenantRepository tenantRepository;
    @Mock private CustomerRepository customerRepository;
    @Mock private PasswordEncoder passwordEncoder;

    // JwtService nao e mockado — usamos o real para verificar o conteudo do token emitido.
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();
        // Secret base64 de 256 bits (32 bytes) — suficiente para HS256.
        ReflectionTestUtils.setField(jwtService, "secret",
                "dGVzdC1zZWNyZXQta2V5LW1pbmltdW0tMzItYnl0ZXMtbG9uZy0xMjM0NTY=");
        ReflectionTestUtils.setField(jwtService, "expiration", 3_600_000L);
        ReflectionTestUtils.setField(jwtService, "refreshExpiration", 86_400_000L);

        authService = new AuthService(
                userRepository,
                tenantRepository,
                customerRepository,
                jwtService,
                passwordEncoder);
    }

    @Test
    void issueCustomerToken_deveIncluirClaimCustomerIdETypeCustomer() {
        // Arrange
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setName("Restaurante Teste");
        tenant.setSlug("teste");

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
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setSlug("teste");

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
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setSlug("teste");

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
        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID());
        tenant.setSlug("t");

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
}
