package br.com.menufacil.service;

import br.com.menufacil.converter.CustomerConverter;
import br.com.menufacil.domain.models.Customer;
import br.com.menufacil.dto.CreateCustomerRequest;
import br.com.menufacil.dto.CustomerResponse;
import br.com.menufacil.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerConverter customerConverter;
    private final PasswordEncoder passwordEncoder;

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
        return customerConverter.toResponse(customer);
    }

    @Transactional
    public CustomerResponse update(UUID id, UUID tenantId, CreateCustomerRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente não encontrado"));
        validateTenant(customer, tenantId);

        customerConverter.updateFromRequest(request, customer);

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            customer.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        }

        customer = customerRepository.save(customer);
        log.info("Cliente atualizado: {} no tenant {}", customer.getName(), tenantId);
        return customerConverter.toResponse(customer);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Cliente não encontrado"));
        validateTenant(customer, tenantId);
        customerRepository.delete(customer);
        log.info("Cliente removido: {} no tenant {}", id, tenantId);
    }

    private void validateTenant(Customer customer, UUID tenantId) {
        if (!customer.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }
}
