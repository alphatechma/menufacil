package br.com.menufacil.config;

import org.springframework.aop.interceptor.AsyncUncaughtExceptionHandler;
import org.springframework.aop.interceptor.SimpleAsyncUncaughtExceptionHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.AsyncConfigurer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

/**
 * Pool de threads dedicado pra execução de {@code @Async}.
 *
 * <p>Substitui o {@link org.springframework.core.task.SimpleAsyncTaskExecutor} padrão
 * do Spring (que cria um novo thread a cada chamada — inadequado para produção).
 *
 * <p>Configuração inicial conservadora:
 * <ul>
 *   <li>core pool: 4 threads sempre vivos</li>
 *   <li>max pool: 16 threads sob carga</li>
 *   <li>queue: 200 tarefas pendentes antes de criar novos threads acima do core</li>
 * </ul>
 * Ajustar conforme volume real do webhook do WhatsApp.
 */
@Configuration
public class AsyncConfig implements AsyncConfigurer {

    @Override
    @Bean(name = "taskExecutor")
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(200);
        executor.setThreadNamePrefix("menufacil-async-");
        executor.setWaitForTasksToCompleteOnShutdown(true);
        executor.setAwaitTerminationSeconds(30);
        executor.initialize();
        return executor;
    }

    @Override
    public AsyncUncaughtExceptionHandler getAsyncUncaughtExceptionHandler() {
        // Para métodos @Async com retorno void; loga via slf4j (default do Spring).
        return new SimpleAsyncUncaughtExceptionHandler();
    }
}
