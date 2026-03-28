package br.com.menufacil.config.tenant;

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

    public static void clear() {
        CURRENT_SLUG.remove();
        CURRENT_ID.remove();
    }
}
