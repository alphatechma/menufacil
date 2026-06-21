package br.com.menufacil.controller;

import br.com.menufacil.config.tenant.TenantContext;
import br.com.menufacil.dto.CustomerAuthResponse;
import br.com.menufacil.dto.CustomerLoginByPhoneRequest;
import br.com.menufacil.dto.CustomerLoginRequest;
import br.com.menufacil.dto.CustomerRegisterRequest;
import br.com.menufacil.dto.LoginRequest;
import br.com.menufacil.dto.LoginResponse;
import br.com.menufacil.dto.RefreshTokenRequest;
import br.com.menufacil.dto.RefreshTokenResponse;
import br.com.menufacil.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthControllerTest {

    @Mock private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private UUID tenantId;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenant("teste", tenantId.toString());
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    void shouldRealizarLoginAdmin() {
        // Arrange
        LoginRequest request = new LoginRequest();
        request.setEmail("admin@menufacil.com");
        request.setPassword("senha123");

        LoginResponse expected = LoginResponse.builder()
                .access_token("admin-token")
                .refresh_token("admin-refresh")
                .tenant_slug("teste")
                .modules(List.of())
                .permissions(List.of())
                .build();
        when(authService.adminLogin(any(LoginRequest.class))).thenReturn(expected);

        HttpServletResponse response = new MockHttpServletResponse();

        // Act
        ResponseEntity<LoginResponse> result =
                authController.adminLogin(request, "teste", response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getAccess_token()).isEqualTo("admin-token");
        verify(authService).adminLogin(any(LoginRequest.class));
    }

    @Test
    void shouldRealizarCustomerLoginPorEmail() {
        // Arrange
        CustomerLoginRequest request = new CustomerLoginRequest();
        request.setEmail("ana@example.com");
        request.setPassword("senha-correta");

        CustomerAuthResponse expected = CustomerAuthResponse.builder()
                .accessToken("customer-token")
                .customer(CustomerAuthResponse.CustomerData.builder()
                        .id(UUID.randomUUID().toString())
                        .email("ana@example.com")
                        .build())
                .build();
        when(authService.customerLogin(eq(tenantId), any(CustomerLoginRequest.class)))
                .thenReturn(expected);

        HttpServletResponse response = new MockHttpServletResponse();

        // Act
        ResponseEntity<CustomerAuthResponse> result =
                authController.customerLogin(request, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getAccessToken()).isEqualTo("customer-token");
        assertThat(result.getBody().getCustomer().getEmail()).isEqualTo("ana@example.com");
        verify(authService).customerLogin(eq(tenantId), any(CustomerLoginRequest.class));
    }

    @Test
    void shouldRealizarCustomerLoginPorTelefone() {
        // Arrange
        CustomerLoginByPhoneRequest request = new CustomerLoginByPhoneRequest();
        request.setPhone("+5511911112222");
        request.setName("Novo Cliente");

        CustomerAuthResponse expected = CustomerAuthResponse.builder()
                .accessToken("phone-token")
                .customer(CustomerAuthResponse.CustomerData.builder()
                        .phone("+5511911112222")
                        .name("Novo Cliente")
                        .build())
                .build();
        when(authService.customerLoginByPhone(eq(tenantId), any(CustomerLoginByPhoneRequest.class)))
                .thenReturn(expected);

        HttpServletResponse response = new MockHttpServletResponse();

        // Act
        ResponseEntity<CustomerAuthResponse> result =
                authController.customerLoginByPhone(request, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getAccessToken()).isEqualTo("phone-token");
        assertThat(result.getBody().getCustomer().getPhone()).isEqualTo("+5511911112222");
        verify(authService).customerLoginByPhone(eq(tenantId), any(CustomerLoginByPhoneRequest.class));
    }

    @Test
    void shouldRefreshAccessToken() {
        // Arrange
        RefreshTokenRequest request = new RefreshTokenRequest();
        request.setRefreshToken("refresh-original");

        RefreshTokenResponse expected = RefreshTokenResponse.builder()
                .accessToken("novo-access-token")
                .refreshToken("refresh-original")
                .build();
        when(authService.refreshAccessToken("refresh-original")).thenReturn(expected);

        HttpServletResponse response = new MockHttpServletResponse();

        // Act
        ResponseEntity<RefreshTokenResponse> result =
                authController.refresh(request, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getAccessToken()).isEqualTo("novo-access-token");
        assertThat(result.getBody().getRefreshToken()).isEqualTo("refresh-original");
        verify(authService).refreshAccessToken("refresh-original");
    }

    @Test
    void shouldRegistrarCustomer() {
        // Arrange
        CustomerRegisterRequest request = new CustomerRegisterRequest();
        request.setName("Bia");
        request.setEmail("bia@example.com");
        request.setPhone("+5511988887777");
        request.setPassword("senha123");

        CustomerAuthResponse expected = CustomerAuthResponse.builder()
                .accessToken("register-token")
                .customer(CustomerAuthResponse.CustomerData.builder()
                        .id(UUID.randomUUID().toString())
                        .email("bia@example.com")
                        .phone("+5511988887777")
                        .build())
                .build();
        when(authService.customerRegister(eq(tenantId), any(CustomerRegisterRequest.class)))
                .thenReturn(expected);

        HttpServletResponse response = new MockHttpServletResponse();

        // Act
        ResponseEntity<CustomerAuthResponse> result =
                authController.customerRegister(request, response);

        // Assert
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getAccessToken()).isEqualTo("register-token");
        verify(authService).customerRegister(eq(tenantId), any(CustomerRegisterRequest.class));
    }
}
