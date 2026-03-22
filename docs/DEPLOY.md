# Deploy - MenuFacil

Guia de deploy para todas as aplicacoes do monorepo MenuFacil.

## Arquitetura

O MenuFacil e composto por 6 servicos:

| Servico | Diretorio | Porta (prod) | Descricao |
|---------|-----------|--------------|-----------|
| **API** | `apps/api` | 3000 | Backend NestJS + TypeORM + PostgreSQL |
| **Web** | `apps/web` | 80 | App principal (admin + storefront do cliente) |
| **Manager** | `apps/manager` | 82 | Painel do super administrador |
| **Waiter** | `apps/waiter` | 83 | App dos garcons (gestao de mesas e pedidos) |
| **PostgreSQL** | - | 5432 | Banco de dados |
| **Redis** | - | 6379 | Cache e filas |
| **MinIO** | - | 9000/9001 | Armazenamento de arquivos (S3-compatible) |

## Pre-requisitos

- Docker e Docker Compose
- Node.js 22+ e pnpm 10+ (para builds locais)

## Estrutura de Deploy

Cada app frontend (web, manager, waiter) segue o mesmo padrao:

```
apps/<app>/
  Dockerfile          # Build multi-stage: pnpm build + nginx
  nginx.conf          # Configuracao do nginx com proxy reverso para API
  docker-entrypoint.sh # Injeta API_URL no nginx.conf em runtime
```

A API usa seu proprio Dockerfile com build do NestJS.

## Deploy Local (Docker Compose)

### Desenvolvimento

O `docker-compose.yml` sobe apenas a infraestrutura (PostgreSQL, Redis, MinIO, pgAdmin):

```bash
docker compose up -d
```

Os apps rodam localmente via `pnpm dev`:

```bash
pnpm --filter web dev        # http://localhost:5173
pnpm --filter @menufacil/waiter dev  # http://localhost:5174
pnpm --filter manager dev     # http://localhost:5175
pnpm --filter api dev         # http://localhost:3000
```

### Producao local

O `docker-compose.prod.yml` sobe todos os servicos containerizados:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Servicos disponiveis:

- API: `http://localhost:3000`
- Web: `http://localhost:80`
- Manager: `http://localhost:82`
- Waiter: `http://localhost:83`
- MinIO Console: `http://localhost:9001`

## Deploy em Producao (Easypanel)

No Easypanel, cada app e criado como um servico separado.

### 1. API

- **Tipo:** App (Dockerfile)
- **Dockerfile:** `apps/api/Dockerfile`
- **Porta:** 3000
- **Variaveis de ambiente:**
  - `NODE_ENV=production`
  - `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`
  - `REDIS_HOST`, `REDIS_PORT`
  - `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`
  - `JWT_SECRET`, `JWT_REFRESH_SECRET`

### 2. Web (Admin + Storefront)

- **Tipo:** App (Dockerfile)
- **Dockerfile:** `apps/web/Dockerfile`
- **Porta:** 80
- **Variaveis de ambiente:**
  - `API_URL` — URL interna da API (ex: `http://api:3000`)
- **IMPORTANTE:** O painel admin foi migrado para dentro do `apps/web`. O app
  antigo `apps/admin` esta **descontinuado** e nao deve ser usado para deploy.
  Se o Easypanel ainda aponta para `apps/admin/Dockerfile`, atualize para
  `apps/web/Dockerfile`.

### 3. Manager

- **Tipo:** App (Dockerfile)
- **Dockerfile:** `apps/manager/Dockerfile`
- **Porta:** 80
- **Variaveis de ambiente:**
  - `API_URL` — URL interna da API

### 4. Waiter (App dos Garcons)

- **Tipo:** App (Dockerfile)
- **Dockerfile:** `apps/waiter/Dockerfile`
- **Porta:** 80
- **Variaveis de ambiente:**
  - `API_URL` — URL interna da API
- **Notas:**
  - App mobile-first para garcons gerenciarem mesas e pedidos
  - Usa WebSocket (Socket.IO) para atualizacoes em tempo real
  - O nginx.conf ja inclui proxy para `/socket.io/`

### 5. Infraestrutura

- **PostgreSQL 16** — Banco principal
- **Redis 7** — Cache de sessoes e filas de eventos
- **MinIO** — Upload de imagens de produtos

## Variaveis de Ambiente

Copie o `.env.example` para `.env` e configure:

```bash
cp .env.example .env
```

Variaveis criticas para producao:

| Variavel | Descricao |
|----------|-----------|
| `DB_HOST` | Host do PostgreSQL |
| `DB_PASSWORD` | Senha do banco |
| `JWT_SECRET` | Segredo para tokens JWT |
| `JWT_REFRESH_SECRET` | Segredo para refresh tokens |
| `MINIO_ACCESS_KEY` | Chave de acesso do MinIO |
| `MINIO_SECRET_KEY` | Chave secreta do MinIO |
| `API_URL` | URL da API para os frontends |

## Seed do Banco de Dados

Apos o primeiro deploy, rode o seed para criar as permissoes, planos e o usuario super admin:

```bash
pnpm db:seed
# ou diretamente:
pnpm --filter api seed
```

No Easypanel, execute via terminal do servico da API:

```bash
node dist/database/seeds/run-seed.js
```

## Build Manual

Para buildar um app individualmente:

```bash
# Build do shared (dependencia de todos)
pnpm --filter @menufacil/shared build

# Build de cada app
pnpm --filter web build
pnpm --filter @menufacil/waiter build
pnpm --filter manager build
pnpm --filter api build
```

## Nginx e Proxy Reverso

Todos os frontends usam nginx com:

- **Proxy reverso** para `/api/` e `/socket.io/` apontando para a API
- **Gzip** habilitado para assets
- **Cache** de 1 ano para assets estaticos (CSS, JS, imagens)
- **SPA fallback** com `try_files $uri /index.html`
- **API_URL** injetada em runtime via `docker-entrypoint.sh`

## Troubleshooting

### WebSocket nao conecta no waiter

Verifique se o nginx.conf do waiter tem o bloco `/socket.io/` e se `API_URL` esta configurada corretamente.

### Assets nao carregam

Verifique se o build (`pnpm --filter @menufacil/waiter build`) completou sem erros e se o `dist/` foi copiado para o container.

### Erro de CORS

A API deve ter o dominio do waiter na lista de origens permitidas (`CORS_ORIGINS`).
