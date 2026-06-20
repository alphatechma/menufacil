package br.com.menufacil.service;

import br.com.menufacil.converter.UserConverter;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.dto.ChangePasswordRequest;
import br.com.menufacil.dto.CreateUserRequest;
import br.com.menufacil.dto.UpdateUserRequest;
import br.com.menufacil.dto.UserResponse;
import br.com.menufacil.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository userRepository;
    private final UserConverter userConverter;

    public List<UserResponse> findAllByTenant(UUID tenantId) {
        return userRepository.findByTenantIdOrderByNameAsc(tenantId).stream()
                .map(userConverter::toResponse)
                .toList();
    }

    public UserResponse findById(UUID id, UUID tenantId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        validateTenant(user, tenantId);
        return userConverter.toResponse(user);
    }

    public UserResponse findCurrentUser(UUID tenantId) {
        String email = resolveCurrentUserEmail();
        User user = userRepository.findByEmailAndTenantId(email, tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário autenticado não encontrado"));
        return userConverter.toResponse(user);
    }

    @Transactional
    public UserResponse create(UUID tenantId, CreateUserRequest request) {
        if (userRepository.existsByEmailAndTenantId(request.getEmail(), tenantId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "E-mail já está em uso neste tenant");
        }

        User user = userConverter.toEntity(request);
        user.setTenantId(tenantId);
        user.setPasswordHash(new BCryptPasswordEncoder().encode(request.getPassword()));
        user.setActive(true);

        user = userRepository.save(user);
        log.info("Usuário criado: {} no tenant {}", user.getEmail(), tenantId);
        return userConverter.toResponse(user);
    }

    @Transactional
    public UserResponse update(UUID id, UUID tenantId, UpdateUserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        validateTenant(user, tenantId);
        userConverter.updateFromRequest(request, user);

        user = userRepository.save(user);
        log.info("Usuário atualizado: {} no tenant {}", user.getEmail(), tenantId);
        return userConverter.toResponse(user);
    }

    @Transactional
    public void changeCurrentUserPassword(UUID tenantId, ChangePasswordRequest request) {
        String email = resolveCurrentUserEmail();
        User user = userRepository.findByEmailAndTenantId(email, tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário autenticado não encontrado"));

        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        if (!encoder.matches(request.getCurrentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Senha atual incorreta");
        }

        user.setPasswordHash(encoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Senha alterada para o usuário: {} no tenant {}", email, tenantId);
    }

    @Transactional
    public void delete(UUID id, UUID tenantId) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Usuário não encontrado"));

        validateTenant(user, tenantId);
        user.setActive(false);
        userRepository.save(user);
        log.info("Usuário desativado (soft delete): {} no tenant {}", id, tenantId);
    }

    private void validateTenant(User user, UUID tenantId) {
        if (user.getTenantId() == null || !user.getTenantId().equals(tenantId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acesso negado a este recurso");
        }
    }

    private String resolveCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || authentication.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Usuário não autenticado");
        }
        return authentication.getName();
    }
}
