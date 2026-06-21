# MenuFacil API (Java)

API multi-tenant da plataforma MenuFacil escrita em **Spring Boot 3.3.5 + Java 21**.
Coexiste com a API legada NestJS (`apps/api`) durante o cutover progressivo.

---

## Stack

| Camada            | Tecnologia                                                          |
|-------------------|---------------------------------------------------------------------|
| Runtime           | Java 21 (Eclipse Temurin)                                           |
| Framework         | Spring Boot 3.3.5 (Web, Data JPA, Security, Validation, Actuator, AOP, WebSocket) |
| Persistencia      | PostgreSQL 16 + Flyway (V1..V4)                                      |
| ORM               | Hibernate / JPA com multi-tenancy via Hibernate Filter              |
| Seguranca         | Spring Security + JWT (JJWT `0.12.6`)                                |
| Mapeamento        | MapStruct `1.5.5.Final` (entity <-> DTO)                             |
| Boilerplate       | Lombok                                                              |
| Storage           | AWS SDK v2 (`s3` + `url-connection-client`) apontado pro MinIO      |
| E-mail (planejado)| AWS SES (SDK v2)                                                    |
| Real-time         | Spring WebSocket (STOMP) para push de pedidos / WhatsApp            |
| Docs              | springdoc-openapi `2.5.0` (Swagger UI em `/api/docs`)                |
| Build             | Maven (multistage Dockerfile)                                       |
| Observability     | Sentry, Micrometer + Prometheus, OpenTelemetry, Logback JSON        |

---

## Estrutura de pacotes

```
br.com.menufacil/
├── MenuFacilApplication.java
├── config/
│   ├── security/        # SecurityConfig, JwtService, JwtAuthenticationFilter, PermissionsAspect, @RequirePermissions, UserPermissionsService
│   ├── tenant/          # TenantContext, TenantFilter, TenantFilterConfig, TenantConnectionInterceptor, HibernateTenantFilterAspect
│   ├── audit/           # Listeners + auditoria automatica
│   ├── observability/   # MetricsConfig, MetricsService, MdcLoggingFilter, health/
│   ├── AsyncConfig.java # Pool @Async
│   ├── SwaggerConfig.java
│   └── WebSocketConfig.java
├── controller/          # REST endpoints (+ subpacote whatsapp/)
├── service/             # Logica de negocio  (+ subpacote whatsapp/)
├── converter/           # MapStruct mappers entity <-> DTO
├── mapper/              # Mappers auxiliares
├── repository/          # Spring Data JPA (extends JpaRepository / JpaSpecificationExecutor)
├── domain/
│   ├── models/          # Entities JPA (extends BaseEntity)
│   ├── enums/           # UserRole, OrderStatus, PaymentStatus, etc.
│   ├── exception/       # GlobalExceptionHandler + ApiException
│   └── dto/             # DTOs internos ao dominio
└── dto/                 # Request/Response objects publicos
```

---

## Setup local

### Pre-requisitos
- **Java 21** (`sdk install java 21-tem` ou Temurin)
- **Maven 3.9+**
- **PostgreSQL 16** rodando localmente (ou via docker-compose do monorepo)
- (Opcional) **MinIO** local na porta `9000` para uploads
- (Opcional) **Evolution API** local para integracao WhatsApp

### Passos

```bash
# 1. Variaveis de ambiente minimas
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=menufacil
export DB_USER=postgres
export DB_PASS=postgres
export JWT_SECRET=$(openssl rand -base64 48)   # 256+ bits

# 2. Rodar migracoes
mvn flyway:migrate

# 3. Subir a API (porta 3001, context-path /api)
mvn spring-boot:run
```

Endpoints uteis:

| Recurso        | URL                                  |
|----------------|--------------------------------------|
| Health         | `http://localhost:3001/api/actuator/health` |
| Swagger UI     | `http://localhost:3001/api/docs`     |
| OpenAPI JSON   | `http://localhost:3001/api/docs/api-docs` |

---

## Variaveis de ambiente

Todas as variaveis suportadas pelo `application.yml` (com defaults entre `${...:default}`).

### Servidor
| Variavel     | Default | Descricao                                  |
|--------------|---------|--------------------------------------------|
| `API_PORT`   | `3001`  | Porta HTTP. Context-path fixo em `/api`.    |

### Banco de dados (PostgreSQL)
| Variavel  | Default     | Descricao              |
|-----------|-------------|------------------------|
| `DB_HOST` | `localhost` | Host do Postgres        |
| `DB_PORT` | `5432`      | Porta do Postgres       |
| `DB_NAME` | `menufacil` | Nome do database        |
| `DB_USER` | `postgres`  | Usuario                 |
| `DB_PASS` | `postgres`  | Senha                   |

### JWT
| Variavel                  | Default                                         | Descricao                                                                  |
|---------------------------|-------------------------------------------------|----------------------------------------------------------------------------|
| `JWT_SECRET`              | `menufacil-jwt-secret-key-change-in-production` | **Obrigatorio em prod** (256+ bits)                                        |
| `JWT_ACCESS_EXPIRATION`   | `900000`                                        | Access token (ms) — 15min. Vale para admin e customer.                     |
| `JWT_REFRESH_EXPIRATION`  | `604800000`                                     | Refresh token (ms) — 7 dias. Usado por `POST /auth/refresh`.               |

> **Refresh flow:** `POST /auth/refresh` recebe `{ "refreshToken": "..." }` e devolve `{ access_token, refresh_token }`.
> O endpoint detecta automaticamente se o refresh e de admin ou de customer (via claim `subject_type`).
> O `refresh_token` retornado e o mesmo recebido — rotacao + blacklist ainda nao implementadas (TODO).

### MinIO / S3 (uploads)
| Variavel             | Default                  | Descricao                              |
|----------------------|--------------------------|----------------------------------------|
| `MINIO_ENDPOINT`     | `http://localhost`       | Endpoint base                          |
| `MINIO_PORT`         | `9000`                   | Porta                                  |
| `MINIO_USE_SSL`      | `false`                  | TLS?                                   |
| `MINIO_ACCESS_KEY`   | `menufacil`              | Access key                             |
| `MINIO_SECRET_KEY`   | `menufacil123`           | Secret key                             |
| `MINIO_BUCKET`       | `menufacil`              | Bucket destino                         |
| `MINIO_PUBLIC_URL`   | `http://localhost:9000`  | URL publica usada nos links retornados |

### Evolution API (WhatsApp)
| Variavel                | Default                  | Descricao                                  |
|-------------------------|--------------------------|--------------------------------------------|
| `EVOLUTION_API_URL`     | `http://localhost:8080`  | URL da Evolution API                       |
| `EVOLUTION_API_KEY`     | *(vazio)*                | API key global                             |
| `EVOLUTION_WEBHOOK_URL` | *(vazio)*                | URL publica para callbacks de mensagens    |

### AWS SES (planejado, ainda nao em `application.yml`)
| Variavel               | Descricao                              |
|------------------------|----------------------------------------|
| `AWS_SES_REGION`       | Regiao da AWS (ex.: `us-east-1`)        |
| `AWS_SES_ACCESS_KEY`   | Access key IAM com permissao de SES     |
| `AWS_SES_SECRET_KEY`   | Secret key IAM                          |
| `AWS_SES_FROM_EMAIL`   | Remetente padrao verificado no SES      |

### QZ Tray (impressao termica)
| Variavel          | Default                            | Descricao                                      |
|-------------------|------------------------------------|------------------------------------------------|
| (montagem)        | `/certs/menufacil-qz.crt`          | Certificado publico montado em runtime          |
| `QZ_PRIVATE_KEY`  | *(vazio)*                          | Fallback inline se `/certs` nao estiver montado |

---

## Multi-tenancy

Modelo: **schema unico, particionado por `tenant_id`** com filtro Hibernate forcado.

### Fluxo de uma request

1. Cliente envia header `X-Tenant-Slug: <slug-do-restaurante>` (rotas publicas em `SecurityConfig.PUBLIC_ROUTES` ficam isentas).
2. `TenantFilter` (servlet filter) resolve o slug -> `tenant_id` e popula `TenantContext` (`ThreadLocal<UUID>`).
3. `TenantConnectionInterceptor` injeta o contexto no Hibernate antes da abertura da sessao.
4. `HibernateTenantFilterAspect` intercepta todo metodo `@Transactional` e ativa o filtro JPA `tenantFilter` automaticamente.
5. Todas as queries em entidades que herdam de `BaseEntity` recebem `WHERE tenant_id = :tenantId`.

### Entidades globais (sem `tenant_id`)
- `SystemModule`
- `Permission`
- `Plan`
- `AuditLog`
- (e tabelas de migracao do Flyway)

Para essas, o filtro nao se aplica — escritas/leituras passam direto.

### Helper

`TenantContext.getTenantId()` retorna o UUID corrente (use nos services em vez de extrair do controller).

---

## Permissoes granulares

### Arquitetura

- Anotacao `@RequirePermissions("modulo:acao")` nos endpoints (ou metodos de service).
- `PermissionsAspect` intercepta a chamada, consulta `UserPermissionsService` e nega via `AccessDeniedException` se necessario.
- **Bypass automatico** para `SUPER_ADMIN` e `ADMIN` (sempre concedido).
- Resolucao com cache `@Cacheable("user-permissions")` (chave: `userId`).

### Seed

A migracao **V4 (`V4__seed_permissions_and_default_roles.sql`)** popula 36 permissoes (9 modulos x 4 acoes — `create`, `read`, `update`, `delete`):

```
product, category, order, customer, delivery,
coupon, loyalty, kds, report
```

E expoe a funcao SQL `create_default_roles_for_tenant(uuid)` que cria, por tenant, 4 roles padrao (`Manager`, `Cashier`, `Kitchen`, `Waiter`) com permissoes pre-definidas.

### Uso

```java
@PostMapping
@RequirePermissions("product:create")
public ResponseEntity<ProductResponse> create(@RequestBody @Valid ProductRequest req) { ... }
```

---

## Modulos migrados

Todos os modulos abaixo ja possuem controller + service + converter + testes na API Java.

| #  | Modulo              | Status | Endpoints principais                              | Integracoes externas        |
|----|---------------------|--------|---------------------------------------------------|-----------------------------|
| 1  | Auth                | done   | `/auth/login`, `/auth/refresh`, `/auth/customer/*`| JWT                         |
| 2  | User                | done   | `/users`                                          | -                           |
| 3  | Role                | done   | `/roles`                                          | -                           |
| 4  | Permission          | done   | `/permissions`                                    | -                           |
| 5  | SystemModule        | done   | `/system-modules`                                 | -                           |
| 6  | Plan                | done   | `/plans`                                          | -                           |
| 7  | Tenant              | done   | `/tenants`                                        | -                           |
| 8  | TenantUnit          | done   | `/tenant-units`, `/public/tenant-units`           | -                           |
| 9  | SuperAdmin          | done   | `/super-admin/*`                                  | -                           |
| 10 | Customer            | done   | `/customers`                                      | -                           |
| 11 | Category            | done   | `/categories`                                     | -                           |
| 12 | Product             | done   | `/products`                                       | MinIO (imagens)             |
| 13 | Inventory           | done   | `/inventory`, `/stock-movements`                  | -                           |
| 14 | Order               | done   | `/orders`                                         | WebSocket push              |
| 15 | OrderItem           | done   | (parte de Order)                                  | -                           |
| 16 | Payment             | done   | `/payments`                                       | (gateway pendente)          |
| 17 | Coupon              | done   | `/coupons`                                        | -                           |
| 18 | Promotion           | done   | `/promotions`                                     | -                           |
| 19 | Loyalty             | done   | `/loyalty/*`                                      | -                           |
| 20 | LoyaltyReward       | done   | `/loyalty/rewards`                                | -                           |
| 21 | Referral            | done   | `/referrals`                                      | -                           |
| 22 | Wallet              | done   | `/wallet`                                         | -                           |
| 23 | Review              | done   | `/reviews`                                        | -                           |
| 24 | Reservation         | done   | `/reservations`                                   | -                           |
| 25 | RestaurantTable     | done   | `/restaurant-tables`                              | -                           |
| 26 | TableSession        | done   | `/table-sessions`                                 | -                           |
| 27 | FloorPlan           | done   | `/floor-plans`                                    | -                           |
| 28 | DeliveryPerson      | done   | `/delivery-persons`                               | -                           |
| 29 | DeliveryZone        | done   | `/delivery-zones`                                 | -                           |
| 30 | AbandonedCart       | done   | `/abandoned-carts`                                | WhatsApp (recuperacao)      |
| 31 | AuditLog            | done   | `/audit-logs`                                     | -                           |
| 32 | Analytics           | done   | `/analytics/*`                                    | -                           |
| 33 | Upload              | done   | `/uploads`                                        | MinIO / S3                  |
| 34 | QzTray              | done   | `/qz/*`                                           | QZ Tray cert                |
| 35 | Notification        | parcial| `/notifications`                                  | aguardando providers (SES)  |
| 36 | WhatsApp (5 ctrl)   | done   | `/whatsapp/instances\|messages\|templates\|flows\|webhook` | Evolution API   |

Subpacote `controller/whatsapp/` agrupa: `WhatsappInstanceController`, `WhatsappMessageController`, `WhatsappTemplateController`, `WhatsappFlowController`, `WhatsappWebhookController`.

---

## Build & Deploy

### Build local

```bash
mvn clean package                # gera target/menufacil-api-0.1.0.jar
java -jar target/menufacil-api-0.1.0.jar
```

### Docker (multistage)

```bash
docker build -t menufacil/api-java:latest .
docker run --rm -p 3001:3001 \
  -e DB_HOST=host.docker.internal \
  -e JWT_SECRET=... \
  menufacil/api-java:latest
```

Dockerfile:

```dockerfile
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 3001
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Easypanel

- Servico **separado** do `apps/api` (NestJS legado coexiste durante cutover).
- Mesma rede do Postgres/MinIO/Redis ja provisionados.
- Domain: `menufacil.maistechtecnologia.com.br` (roteamento por endpoint via nginx).
- Perfil de prod: `SPRING_PROFILES_ACTIVE=prod` (desliga Flyway automatico e `ddl-auto`).

---

## Testes

- **320 testes unitarios** (Mockito + AssertJ + JUnit 5) distribuidos em 58 arquivos de teste.
- Sem MockMvc: controllers testados como POJO (chamadas diretas + asserts no `ResponseEntity`).

### Padroes adotados

| Camada     | Estrategia                                                                 |
|------------|----------------------------------------------------------------------------|
| Converter  | `@SpringBootTest` (precisa do contexto do MapStruct gerado)                |
| Service    | Mockito puro (`@ExtendWith(MockitoExtension.class)`)                       |
| Controller | Mockito puro, sem MockMvc — chamada direta ao metodo e assert no response  |

### Executando

```bash
mvn test                          # roda tudo
mvn test -Dtest=OrderServiceTest  # roda um teste especifico
mvn test -Dtest='*Converter*'     # roda por padrao de nome
```

---

## Workers ativos

Componentes `@Scheduled` em execucao na API:

| Worker                       | Pacote                                                | Cadencia              | Funcao                                                                                              |
|------------------------------|-------------------------------------------------------|-----------------------|-----------------------------------------------------------------------------------------------------|
| `NotificationWorker`         | `service.notification`                                | `fixedDelay=30s`      | Processa `notifications` em status `pending` (email + whatsapp).                                    |
| `WhatsappFlowWaitWorker`     | `service.whatsapp`                                    | `fixedDelay=10s`      | Retoma execucoes pausadas por nodes `delay` (`whatsapp_flow_waits`).                                |
| `CleanupWorker`              | `service`                                             | `cron=0 0 3 * * *`    | TTL diario: remove `whatsapp_flow_waits` processados >7d e `notifications` em sent/failed >30d.     |

### Configuracao do `CleanupWorker`

| Variavel           | Default | Descricao                                                                                                  |
|--------------------|---------|------------------------------------------------------------------------------------------------------------|
| `CLEANUP_ENABLED`  | `true`  | Quando `false`, desativa o bean (util em dev/CI). Internamente: `@ConditionalOnProperty(cleanup.enabled)`. |

A tabela `audit_logs` **nao** e limpa por esse worker — registros de auditoria sao preservados por compliance.

---

## Observability

Stack instalada no Item 8 (espelha o padrao do **smartobra360**):

| Camada     | Tecnologia                                                | Endpoint / Sink                              |
|------------|-----------------------------------------------------------|----------------------------------------------|
| Erros      | Sentry (`sentry-spring-boot-starter-jakarta` + `sentry-logback`) | `SENTRY_DSN`                            |
| Metricas   | Micrometer + `micrometer-registry-prometheus`             | `GET /api/actuator/prometheus`               |
| Tracing    | OpenTelemetry SDK (`opentelemetry-spring-boot-starter`)   | OTLP gRPC para `OTEL_EXPORTER_OTLP_ENDPOINT` |
| Logs       | Logback + `logstash-logback-encoder` (JSON em prod/hml)   | stdout → Loki / Elastic / Datadog            |
| Healthcheck| Spring Boot Actuator + indicators custom                  | `GET /api/actuator/health`                   |

### Variaveis de ambiente

| Variavel                          | Default                     | Descricao                                                                  |
|-----------------------------------|-----------------------------|----------------------------------------------------------------------------|
| `SENTRY_DSN`                      | (vazio = desabilitado)      | DSN do projeto Sentry — vazio em dev evita ruido.                          |
| `SENTRY_ENVIRONMENT`              | `dev`                       | Tag de ambiente nos eventos (dev/hml/prod).                                 |
| `SENTRY_RELEASE`                  | `menufacil-api@0.1.0`       | Tag de release (sourcemaps / deploys).                                      |
| `SENTRY_TRACES_SAMPLE_RATE`       | `0.1`                       | Amostragem de spans de performance (0..1).                                  |
| `OTEL_EXPORTER_OTLP_ENDPOINT`     | (vazio)                     | Endpoint OTLP (ex.: `http://otel-collector:4317`).                          |
| `OTEL_EXPORTER_OTLP_PROTOCOL`     | `grpc`                      | `grpc` ou `http/protobuf`.                                                  |
| `OTEL_TRACES_EXPORTER`            | `none`                      | `otlp` para habilitar; mantenha `none` em dev local sem collector.          |
| `OTEL_TRACES_SAMPLER_ARG`         | `0.1`                       | Probabilidade de sampling do tracer.                                        |
| `SPRING_PROFILES_ACTIVE`          | `dev`                       | `prod`/`hml` ativam logs JSON via Logback.                                  |

### Endpoints expostos

```
GET /api/actuator/health             -> Status geral (DB + MinIO + EvolutionApi)
GET /api/actuator/health/liveness    -> K8s liveness probe
GET /api/actuator/health/readiness   -> K8s readiness probe
GET /api/actuator/info               -> Versao / git / build
GET /api/actuator/metrics            -> Lista de meters
GET /api/actuator/prometheus         -> Scrape target Prometheus
```

### HealthIndicators custom

- **db** (default do Actuator) — ping no DataSource HikariCP.
- **minio** — `s3Client.listBuckets()` com latencia em `details.latency_ms`.
- **evolutionApi** — `GET /` na Evolution com timeout 2s; reporta `UNKNOWN` quando `evolution.api.url` esta vazia (esperado em dev).

### Metricas customizadas

Todas emitidas via `MetricsService` (fachada centralizada em `config/observability/`).

| Meter (Micrometer)        | Tipo    | Tags                            | Onde incrementa                         |
|---------------------------|---------|---------------------------------|-----------------------------------------|
| `notifications.sent`      | Counter | `channel`, `status`             | `NotificationWorker`                    |
| `flow.executions`         | Counter | `trigger_type`, `result`        | `FlowEngineService` (start/finish)      |
| `flow.execution.duration` | Timer   | `result`                        | `FlowEngineService.finishExecution`     |
| `audit.logs.created`      | Counter | `entity_type`, `action`         | `AuditLogService.log(...)`              |
| `cleanup.removed`         | Counter | `table`                         | `CleanupWorker.dailyCleanup`            |
| `order.created`           | Counter | `order_type`, `payment_method`  | `OrderService.create`                   |
| `payment.webhook`         | Counter | `status`                        | `PaymentService.processWebhook`         |

No Prometheus aparecem com sufixo `_total` (counters) e `_seconds` (timers).

### Como adicionar uma metrica custom

1. Adicionar metodo em `MetricsService` (mantem nomes consistentes).
2. Injetar `MetricsService` no service (Lombok ja gera o construtor via `@RequiredArgsConstructor`).
3. Chamar o metodo no ponto certo (idealmente apos a operacao concluir).
4. Atualizar tests do service afetado adicionando `@Mock private MetricsService metricsService;`.

### Tracing distribuido

- Auto-instrumentacao do `opentelemetry-spring-boot-starter` cobre Spring MVC, JDBC, JPA, RestClient e HikariCP.
- Spans manuais via `@WithSpan` (OpenTelemetry annotations) em hot paths:
  - `FlowEngineService.processIncomingMessage` / `startExecution` / `processIncomingMessageAsync`
  - `OrderService.create`
  - `PaymentService.processWebhook`
- `tenant.id` e propagado como atributo do span via `@SpanAttribute`.
- IDs de trace/span aparecem automaticamente nos logs JSON (MDC `trace_id` / `span_id`).

### Logs estruturados

`src/main/resources/logback-spring.xml`:

- Perfis `dev`/default: texto colorido, otimizado para terminal.
- Perfis `prod`/`hml`: JSON via `LoggingEventCompositeJsonEncoder` (Logstash) com campos:
  - `@timestamp`, `level`, `thread_name`, `logger_name`, `message`, `stack_trace`
  - MDC: `request_id`, `tenant_id`, `tenant_slug`, `trace_id`, `span_id`
  - Atributos extras: `service: menufacil-api`, `env: <profile>`

O filtro `MdcLoggingFilter` (registrado com order=2, apos o `TenantFilter`) injeta `request_id` (header `X-Request-Id` ou UUID novo) e os campos do `TenantContext` no MDC.

### Sentry — captura de exceções

- Bridge Logback: `ERROR` vira evento Sentry; `INFO+` vira breadcrumb (configuravel em `sentry.logging.*`).
- Resolver global registrado com `exception-resolver-order: Integer.MIN_VALUE` para preceder o `GlobalExceptionHandler` do Spring.
- `send-default-pii: false` por compliance.
- Em dev, deixar `SENTRY_DSN` vazio — o SDK inicializa sem fazer chamadas remotas.

### Pendencias / secrets a configurar em prod

- [ ] Provisionar projeto no Sentry e popular `SENTRY_DSN` no Helm values (`secret.sentryDsn`).
- [ ] Subir OTel Collector no cluster + popular `OTEL_EXPORTER_OTLP_ENDPOINT`.
- [ ] Adicionar `ServiceMonitor` (Prometheus Operator) apontando para `/api/actuator/prometheus`.
- [ ] Configurar Promtail / Vector para shipping dos logs JSON (stdout) para Loki.
- [ ] Criar dashboard Grafana base com paineis para os meters customizados.

---

## Pendencias conhecidas

- **Notification**: aguardando providers — Amazon SES sendo implementado (envio de e-mail transacional).
- **Payment**: aguardando definicao do gateway (Pagar.me / Stripe / Mercado Pago a decidir).
- **Cutover do NestJS**: estrategia sugerida — **route-by-endpoint via nginx**, comecando pelos modulos novos ja 100% migrados (whatsapp/*, analytics, audit-logs, abandoned-cart). Modulos com integracao externa critica (payment) ficam por ultimo.
- **Cache de permissoes**: hoje em memoria (`@Cacheable` default — `ConcurrentMapCacheManager`). Migrar para Redis quando houver multiplas instancias.
- **Open API**: alguns endpoints publicos (`/public/*`) ainda sem `@Operation` documentado.
