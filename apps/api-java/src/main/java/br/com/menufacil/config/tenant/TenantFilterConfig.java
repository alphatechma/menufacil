package br.com.menufacil.config.tenant;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;

/**
 * Registra os filtros de tenant com ordem de execução.
 */
@Configuration
@RequiredArgsConstructor
public class TenantFilterConfig {

    private final DataSource dataSource;

    @Bean
    public FilterRegistrationBean<TenantFilter> tenantFilter() {
        FilterRegistrationBean<TenantFilter> registration = new FilterRegistrationBean<>();
        registration.setFilter(new TenantFilter(dataSource));
        registration.addUrlPatterns("/*");
        registration.setOrder(1);
        return registration;
    }
}
