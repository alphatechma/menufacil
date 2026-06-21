package br.com.menufacil.service;

import br.com.menufacil.converter.CustomerConverter;
import br.com.menufacil.domain.models.Customer;
import br.com.menufacil.dto.CreateCustomerRequest;
import br.com.menufacil.dto.CustomerResponse;
import br.com.menufacil.repository.CustomerRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerConverter customerConverter;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<CustomerResponse> findAllByTenant(UUID tenantId) {
        return customerRepository.findByTenantId(tenantId).stream()
                .map(customerConverter::toResponse)
                .toList();
    }

    public CustomerResponse findById(UUID id, UUID tenantId) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente não encontrado"));
        validateTenant(customer, tenantId);
        return customerConverter.toResponse(customer);
    }

    @Transactional
    public CustomerResponse create(UUID tenantId, CreateCustomerRequest request) {
        Customer customer = customerConverter.toEntity(request);
        customer.setTenantId(tenantId);

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            customer.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        customer = customerRepository.save(customer);
        log.info("Cliente criado: {} no tenant {}", customer.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("name", customer.getName());
            details.put("email", customer.getEmail());
            details.put("phone", customer.getPhone());
            auditLogService.log(
                    customer.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "create",
                    "customer",
                    customer.getId(),
                    customer.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de criação de cliente: {}", e.getMessage());
        }

        return customerConverter.toResponse(customer);
    }

    @Transactional
    public CustomerResponse update(UUID id, UUID tenantId, CreateCustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente não encontrado"));
        validateTenant(customer, tenantId);

        String oldName = customer.getName();
        String oldEmail = customer.getEmail();
        String oldPhone = customer.getPhone();

        customerConverter.updateFromRequest(request, customer);

        boolean passwordChanged = false;
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            customer.setPasswordHash(passwordEncoder.encode(request.getPassword()));
            passwordChanged = true;
        }

        customer = customerRepository.save(customer);
        log.info("Cliente atualizado: {} no tenant {}", customer.getName(), tenantId);

        try {
            Map<String, Object> details = new HashMap<>();
            details.put("oldName", oldName);
            details.put("newName", customer.getName());
            details.put("oldEmail", oldEmail);
            details.put("newEmail", customer.getEmail());
            details.put("oldPhone", oldPhone);
            details.put("newPhone", customer.getPhone());
            details.put("passwordChanged", passwordChanged);
            auditLogService.log(
                    customer.getTenantId(),
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "update",
                    "customer",
                    customer.getId(),
                    customer.getName(),
                    serializeDetails(details),
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de atualização de cliente: {}", e.getMessage());
        }

        return customerConverter.toResponse(customer);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente não encontrado"));
        validateTenant(customer, tenantId);

        UUID customerId = customer.getId();
        UUID customerTenantId = customer.getTenantId();
        String customerName = customer.getName();

        customerRepository.delete(customer);
        log.info("Cliente removido: {} no tenant {}", id, tenantId);

        try {
            auditLogService.log(
                    customerTenantId,
                    getCurrentUserId(),
                    getCurrentUserEmail(),
                    "delete",
                    "customer",
                    customerId,
                    customerName,
                    null,
                    getCurrentIpAddress()
            );
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria de remoção de cliente: {}", e.getMessage());
        }
    }

    private void validateTenant(Customer customer, UUID tenantId) {
        if (!customer.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }

    private String getCurrentUserEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null ? auth.getName() : null;
    }

    private UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        Object details = auth.getDetails();
        if (details instanceof Claims claims) {
            String userId = claims.get("userId", String.class);
            if (userId != null && !userId.isBlank()) {
                try { return UUID.fromString(userId); } catch (IllegalArgumentException ignored) {}
            }
        }
        return null;
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

    private String serializeDetails(Map<String, Object> details) {
        if (details == null || details.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(details);
        } catch (Exception e) {
            return details.toString();
        }
    }
}
