package br.com.menufacil.config.tenant;

public class TenantContext {

    private static final ThreadLocal<String> currentTenantSlug = new ThreadLocal<>();
    private static final ThreadLocal<String> currentTenantId = new ThreadLocal<>();

    public static void setCurrentTenant(String slug, String id) {
        currentTenantSlug.set(slug);
        currentTenantId.set(id);
    }

    public static String getCurrentSlug() {
        return currentTenantSlug.get();
    }

    public static String getCurrentId() {
        return currentTenantId.get();
    }

    public static void clear() {
        currentTenantSlug.remove();
        currentTenantId.remove();
    }
}
