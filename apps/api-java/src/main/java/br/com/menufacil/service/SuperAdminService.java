package br.com.menufacil.service;

import br.com.menufacil.domain.enums.UserRole;
import br.com.menufacil.domain.models.Tenant;
import br.com.menufacil.domain.models.User;
import br.com.menufacil.dto.*;
import br.com.menufacil.repository.TenantRepository;
import br.com.menufacil.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SuperAdminService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Estatísticas gerais do dashboard super admin.
     */
    public SuperAdminStatsResponse getDashboardStats() {
        long totalTenants = tenantRepository.countByDeletedAtIsNull();
        long activeTenants = tenantRepository.countByIsActiveTrueAndDeletedAtIsNull();
        long totalUsers = userRepository.count();

        // MRR simplificado: contar tenants ativos (em produção, fazer JOIN com tabela plans)
        // Por enquanto usa valor fixo por plano como placeholder
        BigDecimal mrr = BigDecimal.valueOf(activeTenants).multiply(BigDecimal.valueOf(99.90));

        // Tenants agrupados por plano
        List<Object[]> planCounts = tenantRepository.countByPlanGrouped();
        List<SuperAdminStatsResponse.TenantsByPlan> tenantsByPlan = planCounts.stream()
                .map(row -> SuperAdminStatsResponse.TenantsByPlan.builder()
                        .planId(row[0] != null ? row[0].toString() : "sem_plano")
                        .planName(row[0] != null ? row[0].toString() : "Sem plano")
                        .count((Long) row[1])
                        .build())
                .collect(Collectors.toList());

        return SuperAdminStatsResponse.builder()
                .totalTenants(totalTenants)
                .activeTenants(activeTenants)
                .totalUsers(totalUsers)
                .mrr(mrr)
                .tenantsByPlan(tenantsByPlan)
                .build();
    }

    /**
     * Lista paginada de tenants com filtros.
     */
    public Page<TenantListResponse> listTenants(String search, Boolean isActive, boolean deleted,
                                                 int page, int limit) {
        Pageable pageable = PageRequest.of(page, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Tenant> tenants = tenantRepository.findWithFilters(search, isActive, deleted, pageable);

        return tenants.map(tenant -> TenantListResponse.builder()
                .id(tenant.getId())
                .name(tenant.getName())
                .slug(tenant.getSlug())
                .logoUrl(tenant.getLogoUrl())
                .phone(tenant.getPhone())
                .isActive(tenant.isActive())
                .planId(tenant.getPlanId())
                .userCount(userRepository.countByTenantId(tenant.getId()))
                .createdAt(tenant.getCreatedAt())
                .deletedAt(tenant.getDeletedAt())
                .build());
    }

    /**
     * Detalhe de um tenant com seus usuários.
     */
    public TenantDetailResponse getTenantDetail(UUID tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Tenant não encontrado"));

        List<User> users = userRepository.findByTenantId(tenantId);
        List<TenantDetailResponse.UserSummary> userSummaries = users.stream()
                .map(user -> TenantDetailResponse.UserSummary.builder()
                        .id(user.getId())
                        .name(user.getName())
                        .email(user.getEmail())
                        .systemRole(user.getSystemRole().name())
                        .isActive(user.isActive())
                        .build())
                .collect(Collectors.toList());

        return TenantDetailResponse.builder()
                .id(tenant.getId())
                .name(tenant.getName())
                .slug(tenant.getSlug())
                .logoUrl(tenant.getLogoUrl())
                .bannerUrl(tenant.getBannerUrl())
                .primaryColor(tenant.getPrimaryColor())
                .secondaryColor(tenant.getSecondaryColor())
                .accentColor(tenant.getAccentColor())
                .phone(tenant.getPhone())
                .address(tenant.getAddress())
                .businessHours(tenant.getBusinessHours())
                .minOrderValue(tenant.getMinOrderValue())
                .isActive(tenant.isActive())
                .planId(tenant.getPlanId())
                .orderModes(tenant.getOrderModes())
                .paymentConfig(tenant.getPaymentConfig())
                .cancelTimeLimit(tenant.getCancelTimeLimit())
                .createdAt(tenant.getCreatedAt())
                .updatedAt(tenant.getUpdatedAt())
                .deletedAt(tenant.getDeletedAt())
                .users(userSummaries)
                .build();
    }

    /**
     * Cria tenant com usuário admin vinculado.
     */
    @Transactional
    public TenantDetailResponse createTenantWithAdmin(CreateTenantWithAdminRequest request) {
        // Validar slug único
        if (tenantRepository.findBySlug(request.getSlug()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Já existe um tenant com o slug: " + request.getSlug());
        }

        // Validar email único
        if (userRepository.existsByEmail(request.getAdminEmail())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Já existe um usuário com o e-mail: " + request.getAdminEmail());
        }

        // Criar tenant
        Tenant tenant = new Tenant();
        tenant.setName(request.getName());
        tenant.setSlug(request.getSlug());
        tenant.setPhone(request.getPhone());
        tenant.setAddress(request.getAddress());
        tenant.setActive(true);

        if (request.getPlanId() != null && !request.getPlanId().isBlank()) {
            tenant.setPlanId(UUID.fromString(request.getPlanId()));
        }

        tenant = tenantRepository.save(tenant);
        log.info("Tenant '{}' criado pelo super admin", tenant.getName());

        // Criar usuário admin
        User adminUser = new User();
        adminUser.setName(request.getAdminName());
        adminUser.setEmail(request.getAdminEmail());
        adminUser.setPasswordHash(passwordEncoder.encode(request.getAdminPassword()));
        adminUser.setSystemRole(UserRole.admin);
        adminUser.setTenantId(tenant.getId());
        adminUser.setActive(true);

        userRepository.save(adminUser);
        log.info("Admin '{}' criado para tenant '{}'", adminUser.getEmail(), tenant.getName());

        return getTenantDetail(tenant.getId());
    }

    /**
     * Atualiza dados de um tenant.
     */
    @Transactional
    public TenantDetailResponse updateTenant(UUID tenantId, UpdateTenantRequest request) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Tenant não encontrado"));

        if (request.getName() != null) tenant.setName(request.getName());
        if (request.getSlug() != null) {
            // Validar slug único (exceto o próprio)
            tenantRepository.findBySlug(request.getSlug())
                    .filter(t -> !t.getId().equals(tenantId))
                    .ifPresent(t -> {
                        throw new ResponseStatusException(HttpStatus.CONFLICT,
                                "Já existe um tenant com o slug: " + request.getSlug());
                    });
            tenant.setSlug(request.getSlug());
        }
        if (request.getPhone() != null) tenant.setPhone(request.getPhone());
        if (request.getAddress() != null) tenant.setAddress(request.getAddress());
        if (request.getLogoUrl() != null) tenant.setLogoUrl(request.getLogoUrl());
        if (request.getBannerUrl() != null) tenant.setBannerUrl(request.getBannerUrl());
        if (request.getPrimaryColor() != null) tenant.setPrimaryColor(request.getPrimaryColor());
        if (request.getSecondaryColor() != null) tenant.setSecondaryColor(request.getSecondaryColor());
        if (request.getAccentColor() != null) tenant.setAccentColor(request.getAccentColor());
        if (request.getBusinessHours() != null) tenant.setBusinessHours(request.getBusinessHours());
        if (request.getOrderModes() != null) tenant.setOrderModes(request.getOrderModes());
        if (request.getPaymentConfig() != null) tenant.setPaymentConfig(request.getPaymentConfig());
        if (request.getCancelTimeLimit() != null) tenant.setCancelTimeLimit(request.getCancelTimeLimit());
        if (request.getPlanId() != null) {
            tenant.setPlanId(request.getPlanId().isBlank() ? null : UUID.fromString(request.getPlanId()));
        }

        tenantRepository.save(tenant);
        log.info("Tenant '{}' atualizado pelo super admin", tenant.getName());

        return getTenantDetail(tenantId);
    }

    /**
     * Ativar/desativar tenant.
     */
    @Transactional
    public TenantDetailResponse toggleActive(UUID tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Tenant não encontrado"));

        tenant.setActive(!tenant.isActive());
        tenantRepository.save(tenant);

        String action = tenant.isActive() ? "ativado" : "desativado";
        log.info("Tenant '{}' {} pelo super admin", tenant.getName(), action);

        return getTenantDetail(tenantId);
    }

    /**
     * Soft delete: marca deletedAt.
     */
    @Transactional
    public void softDelete(UUID tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Tenant não encontrado"));

        tenant.setDeletedAt(LocalDateTime.now());
        tenant.setActive(false);
        tenantRepository.save(tenant);
        log.info("Tenant '{}' soft-deletado pelo super admin", tenant.getName());
    }

    /**
     * Hard delete: remove permanentemente tenant e seus usuários.
     */
    @Transactional
    public void hardDelete(UUID tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Tenant não encontrado"));

        // Remover usuários vinculados
        List<User> users = userRepository.findByTenantId(tenantId);
        userRepository.deleteAll(users);

        tenantRepository.delete(tenant);
        log.warn("Tenant '{}' removido permanentemente pelo super admin", tenant.getName());
    }
}
