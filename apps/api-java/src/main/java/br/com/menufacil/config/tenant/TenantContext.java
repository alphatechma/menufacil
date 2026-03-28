package br.com.menufacil.config.tenant;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Contexto do tenant corrente via ThreadLocal.
 * Armazena slug e UUID do tenant para a thread atual.
 */
public final class TenantContext {

    private static final ThreadLocal<String> CURRENT_SLUG = new ThreadLocal<>();
    private static final ThreadLocal<String> CURRENT_ID = new ThreadLocal<>();

    private TenantContext() {}

    public static void setCurrentTenant(String slug, String id) {
        CURRENT_SLUG.set(slug);
        CURRENT_ID.set(id);
    }

    public static String getCurrentSlug() {
        return CURRENT_SLUG.get();
    }

    public static String getCurrentId() {
        return CURRENT_ID.get();
    }

    /**
     * Retorna o UUID do tenant corrente.
     * Lança exceção se não houver tenant no contexto.
     * Usar apenas quando precisar do UUID explícito (ex: criar entidade sem BaseEntity).
     * Para queries normais, o HibernateTenantFilterAspect já filtra automaticamente.
     */
    public static UUID getRequiredTenantUUID() {
        String id = CURRENT_ID.get();
        if (id == null || id.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Header X-Tenant-Slug é obrigatório");
        }
        return UUID.fromString(id);
    }

    public static void clear() {
        CURRENT_SLUG.remove();
        CURRENT_ID.remove();
    }
}
