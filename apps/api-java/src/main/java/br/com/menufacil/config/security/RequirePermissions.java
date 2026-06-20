package br.com.menufacil.config.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation para exigir permissões granulares em endpoints.
 * Equivalente ao @RequirePermissions + PermissionsGuard do NestJS.
 *
 * Exemplos:
 *   @RequirePermissions("product:create")
 *   @RequirePermissions(value = {"product:read", "product:update"}, operator = LogicalOperator.AND)
 *   @RequirePermissions(value = {"order:read", "kds:read"}, operator = LogicalOperator.OR)
 *
 * SUPER_ADMIN e ADMIN possuem bypass automático (acesso total).
 */
@Target({ElementType.METHOD, ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequirePermissions {

    /**
     * Lista de chaves de permissão exigidas (ex: "product:create", "order:read").
     */
    String[] value();

    /**
     * Operador lógico aplicado à lista de permissões.
     * AND (default): exige TODAS as permissões.
     * OR: exige PELO MENOS UMA.
     */
    LogicalOperator operator() default LogicalOperator.AND;

    enum LogicalOperator {
        AND,
        OR
    }
}
