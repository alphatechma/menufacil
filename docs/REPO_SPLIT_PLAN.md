# MenuFacil — Plano de Migracao Monorepo → Multi-Repo

> **Status:** Proposta / planejamento. NAO executar sem aprovacao explicita.
> **Referencia:** padrao SmartObra360 (multi-repo + Helm + ArgoCD + Jenkins).
> **Autor inicial:** Claude (assistido por sessao Code).
> **Data:** 2026-06-21.

Este documento descreve a estrategia recomendada para quebrar o monorepo `menufacil/` em multiplos repositorios independentes, preservando historico, viabilizando CI/CD por aplicacao e seguindo o padrao GitOps ja consolidado no SmartObra360.

---

## Indice

1. [Estrutura recomendada de repos](#1-estrutura-recomendada-de-repos)
2. [Mapping de codigo](#2-mapping-de-codigo)
3. [Tratamento do `@menufacil/shared`](#3-tratamento-do-menufacilshared)
4. [Migration step-by-step (preservando historico)](#4-migration-step-by-step-preservando-historico)
5. [CI/CD por repo](#5-cicd-por-repo)
6. [Versionamento](#6-versionamento)
7. [Cross-repo dependencies](#7-cross-repo-dependencies)
8. [Local development setup](#8-local-development-setup)
9. [Ordem de migracao](#9-ordem-de-migracao)
10. [Riscos e mitigacoes](#10-riscos-e-mitigacoes)
11. [Checklist de execucao](#11-checklist-de-execucao)

---

## 1. Estrutura recomendada de repos

Espelhando o padrao SmartObra360 (1 repo por componente deployavel + 1 repo de GitOps + 1 repo de infraestrutura compartilhada), o MenuFacil ficaria com **8 repositorios**:

| # | Repo | Responsabilidade | Stack | Visibility |
|---|------|------------------|-------|------------|
| 1 | `menufacil-shared` | Types, enums, DTOs, contratos OpenAPI compartilhados entre frontends/backend | TypeScript puro (NPM package) | **Private** |
| 2 | `menufacil-api` | API Spring Boot (multi-tenant via `X-Tenant-Slug`). Migrar/Manter `api-java`. Aposentar `api` NestJS legado durante a migracao. | Java 21 + Spring Boot 3.x + JPA + PostgreSQL + Flyway | **Private** |
| 3 | `menufacil-web` | App principal unificado (admin + storefront) | React 19 + Vite 6 + Redux Toolkit + Tailwind v4 | **Private** |
| 4 | `menufacil-manager` | Painel super-admin (gestao de tenants/plans) | React + Vite + Tailwind | **Private** |
| 5 | `menufacil-waiter` | App garcom (pedido na mesa) | React + Vite | **Private** |
| 6 | `menufacil-desktop` | App desktop (Tauri) + integracao QZ Tray | React + Vite + Tauri (Rust) | **Private** |
| 7 | `menufacil-gitops` | Helm charts (`backend`, `static-frontend`) + `apps/<app>/values-{prod,hml}.yaml` consumidos pelo ArgoCD | Helm + YAML | **Private** |
| 8 | `menufacil-infra` | Docker compose dev, scripts, certificados QZ, docs de deploy, terraform/IaC (futuro) | Bash + YAML + (Terraform futuro) | **Private** |

### Convencoes de nomes (alinhadas ao smartobra)

- Repos de aplicacao: `menufacil-<componente>` (ex.: `menufacil-api`, `menufacil-web`).
- Repo de gitops: `menufacil-gitops`.
- Repo de infra/dev: `menufacil-infra`.
- Imagens Docker: `<org>/menufacil-<componente>` (ex.: Docker Hub `alphatechia/menufacil-api` ou GHCR `ghcr.io/maistech/menufacil-api`).
- Namespaces K8s: `menufacil` (prod) e `menufacil-hml` (hml).
- Dominios: `<app>.menufacil.maistechtecnologia.com.br` (prod) e `<app>.hml.menufacil.maistechtecnologia.com.br` (hml).
  - Backend: `api.menufacil.maistechtecnologia.com.br`.
  - Web: `menufacil.maistechtecnologia.com.br` (root).
  - Manager: `manager.menufacil.maistechtecnologia.com.br` (porta 82 hoje).
  - Waiter: `waiter.menufacil.maistechtecnologia.com.br` (porta 83 hoje).
- TLS secrets: `menufacil-<app>-tls`.

### Nota sobre Application CRs do ArgoCD

Seguindo o smartobra, as `Application` CRs do ArgoCD **NAO** ficam no `menufacil-gitops`. Elas vivem em `alphatech-infra-gitops` (ou repo equivalente compartilhado AlphaTech/MaisTech), em `argocd/applications/menufacil/`. O `menufacil-gitops` so guarda charts + values.

---

## 2. Mapping de codigo

Tabela mostrando a origem atual no monorepo e o destino apos o split.

| Caminho atual no monorepo | Repo destino | Caminho destino | Observacoes |
|---------------------------|--------------|-----------------|-------------|
| `apps/api-java/` | `menufacil-api` | `/` (raiz) | Vira repo principal de backend. `pom.xml`, `src/`, `Dockerfile` vao pra raiz |
| `apps/api/` (NestJS legado) | (deprecado) | `legacy/` em `menufacil-infra` ou tag final + arquivamento | Confirmar que `api-java` cobre 100% antes de aposentar |
| `apps/web/` | `menufacil-web` | `/` | `package.json` deixa de referenciar workspace e instala `@menufacil/shared` via npm |
| `apps/manager/` | `menufacil-manager` | `/` | Idem |
| `apps/waiter/` | `menufacil-waiter` | `/` | Idem |
| `apps/desktop/` | `menufacil-desktop` | `/` | Inclui `src-tauri/` e icone |
| `packages/shared/` | `menufacil-shared` | `/` | Publicado como `@menufacil/shared` no registry privado |
| `k8s/` | `menufacil-gitops` (consolidar) + `menufacil-infra` (legado) | `charts/` + `apps/` | Refatorar de Kustomize para Helm chart compartilhado seguindo padrao smartobra |
| `docker-compose.yml` | `menufacil-infra` | `/dev/docker-compose.yml` | Compose unico para subir ambiente local completo |
| `docker-compose.prod.yml` | `menufacil-infra` | `/legacy/` | Aposentar — substituido por K8s/Helm |
| `digital-certificate.txt`, `private.key`, certs QZ Tray | `menufacil-infra` (somente referencias) | `docs/qz-tray.md` | **NUNCA commitar chaves privadas** — mover para Vault/SealedSecrets |
| `scripts/bump-desktop.sh` | `menufacil-desktop` | `scripts/` | Especifico do desktop |
| `docs/DEPLOY.md`, `docs/plans/` | `menufacil-infra` | `docs/` | Documentacao operacional centralizada |
| `tsconfig.base.json` | (duplicado) | Cada repo TS | Cada repo passa a ter seu proprio `tsconfig.json` consolidado |
| `pnpm-workspace.yaml`, `pnpm-lock.yaml` root | (descartado) | — | Workspace deixa de existir; cada repo tem seu proprio `pnpm-lock.yaml` |
| `.github/workflows/` | (dividido) | Cada repo `.github/workflows/` | Workflow por repo |
| `.env`, `.env.example` | Cada repo (`.env.example` apenas) | Cada repo | Definir contrato de envs por repo |
| `README.md` | Cada repo | Cada repo | Readme generico por aplicacao + 1 README guarda-chuva em `menufacil-infra` |

---

## 3. Tratamento do `@menufacil/shared`

### Opcoes avaliadas

| Opcao | Pros | Contras | Veredicto |
|-------|------|---------|-----------|
| **A — NPM package privado (GitHub Packages ou npm.js privado)** | Versionamento explicito (semver), CI/CD por release, locking via `pnpm-lock`, padrao da industria | Requer publicar pacote a cada mudanca; PRs cross-repo para bumps; precisa de token de leitura em CI dos consumidores | **Recomendado** |
| B — Git submodule | Sem registry; commit fixa SHA | Quebra DX (pull manual, `--recurse-submodules`); ruim para CI; historico confuso | Nao recomendado |
| C — Git subtree | Permite contribuir do consumidor sem mudar de repo | Sincronizacao manual entre repos; perde isolamento; nao escala bem | Nao recomendado |
| D — Path mapping `tsconfig` apontando para checkout local | Zero overhead em dev | Quebra build em CI; cada repo precisa do checkout do shared no mesmo nivel; impossivel publicar imagem auto-contida | Nao recomendado |
| E — Continuar monorepo (status quo) | Zero migracao | Perde tudo que essa migracao pretende ganhar | Fora do escopo |

### Recomendacao: **Opcao A — NPM package privado**

- Registry: **GitHub Packages** (`@menufacil/shared` publicado em `npm.pkg.github.com`) ou **registry privado proprio** (Verdaccio/Nexus self-hosted no DOKS).
- Cada repo consumidor adiciona um `.npmrc` com `@menufacil:registry=https://npm.pkg.github.com` + token `NPM_TOKEN` (leitura) no segredo de CI.
- Versionamento: SemVer puro (`1.0.0`, `1.1.0`, etc.). Tag `v1.1.0` no `menufacil-shared` dispara workflow de publish.
- Consumidores fixam `^1.0.0` por padrao; bumps maiores (breaking) viram PRs explicitos.
- **OpenAPI types**: o `menufacil-shared` expoe tambem types gerados do contrato OpenAPI da API Spring (gerados via `openapi-typescript` em CI; ver secao 7).

### Tradeoffs aceitos

- Necessidade de gerenciar `NPM_TOKEN` em todos os CIs consumidores.
- Mudanca pequena no shared exige: PR no shared → merge → tag → publish → bump nos consumidores. Mitigacao: script `scripts/bump-shared.sh` em cada repo + Renovate/Dependabot configurado para auto-PR.

---

## 4. Migration step-by-step (preservando historico)

Para cada repo a ser criado, executar a sequencia abaixo. Usa `git subtree split` para extrair pastas com historico intacto (preferivel a `git filter-repo` quando o objetivo eh isolar uma pasta inteira sem reescrever).

### Pre-requisitos

```bash
# No monorepo, garantir tudo limpo
cd /Users/mesquitadev/Projetos/MaisTech/menufacil
git status                # deve estar clean
git checkout main
git pull
```

### Template — para CADA novo repo

```bash
# 1. No GitHub, criar repo VAZIO (sem README, sem .gitignore, sem license)
gh repo create <org>/menufacil-<X> --private --description "MenuFacil <X>"

# 2. Localmente no monorepo, extrair branch com historico filtrado para a subpasta
cd /Users/mesquitadev/Projetos/MaisTech/menufacil
git subtree split --prefix=apps/<X> -b split-<X>

# Para o shared:
git subtree split --prefix=packages/shared -b split-shared

# 3. Validar (opcional): ver os commits que foram para a branch split
git log --oneline split-<X> | head -20

# 4. Push para o repo novo como main
git push git@github.com:<org>/menufacil-<X>.git split-<X>:main

# 5. Clonar o novo repo num diretorio guarda-chuva (espelhando smartobra)
cd /Users/mesquitadev/Projetos/MaisTech/menufacil-multirepo/
git clone git@github.com:<org>/menufacil-<X>.git

# 6. Validar historico preservado
cd menufacil-<X>
git log --oneline | wc -l   # deve ter centenas de commits, nao 1
git log --follow -- <arquivo-chave>   # confirma que arquivos antigos ainda tem historico

# 7. Limpar a branch split do monorepo (opcional, apos validar)
cd /Users/mesquitadev/Projetos/MaisTech/menufacil
git branch -D split-<X>
```

### Pos-migracao no monorepo original

Apos TODOS os repos estarem criados e validados (NAO antes):

```bash
# Em PR de cleanup separado:
git checkout -b chore/archive-monorepo
git rm -rf apps/ packages/ k8s/ docker-compose*.yml scripts/

# Substituir README.md por um aviso de redirecionamento:
cat > README.md <<'EOF'
# MenuFacil (monorepo arquivado)

Este repositorio foi dividido em multiplos repos. Veja:

- API: https://github.com/<org>/menufacil-api
- Web: https://github.com/<org>/menufacil-web
- Manager: https://github.com/<org>/menufacil-manager
- Waiter: https://github.com/<org>/menufacil-waiter
- Desktop: https://github.com/<org>/menufacil-desktop
- Shared: https://github.com/<org>/menufacil-shared
- GitOps: https://github.com/<org>/menufacil-gitops
- Infra: https://github.com/<org>/menufacil-infra

Historico preservado neste repo (read-only).
EOF

git add -A
git commit -m "chore: arquivar monorepo apos migracao multi-repo"
git push origin chore/archive-monorepo
# Merge na main
# Depois: Settings → Archive repository no GitHub
```

### Por que `git subtree split` e nao `git filter-repo`?

- `subtree split` mantem o repo original intacto e cria uma branch derivada — reversivel.
- Preserva merges e commits exatamente como no monorepo (filtra so por caminho).
- Nao requer instalar ferramenta externa (filter-repo precisa `pip install`).
- Funciona bem para pastas inteiras (`apps/api-java`, `packages/shared`).

Se for necessario filtragem mais cirurgica (ex.: mover um subset de arquivos de pastas diferentes para o mesmo repo destino), `git filter-repo` eh mais flexivel. Para o caso MenuFacil, `subtree split` cobre 100%.

---

## 5. CI/CD por repo

Seguindo o padrao smartobra (Jenkins multibranch), porem com opcao mais moderna **GitHub Actions** como recomendacao (ja temos `.github/workflows/` no monorepo hoje). Os pipelines em ambos cumprem o mesmo papel.

### Stages padronizados

Para cada repo de aplicacao (`menufacil-api`, `menufacil-web`, `menufacil-manager`, `menufacil-waiter`, `menufacil-desktop`):

1. **Checkout** — pega o codigo + tags.
2. **Setup** — Java 21 (api) ou Node 20 (frontends) ou Tauri toolchain (desktop).
3. **Lint + Test** — `pnpm lint && pnpm test` (frontends) ou `./mvnw test` (api).
4. **Build** — `pnpm build` (Vite) ou `./mvnw package -DskipTests` (Spring Boot).
5. **Docker build & push** — `docker buildx`:
   - Backend: `linux/amd64,linux/arm64` (multi-arch).
   - Frontends: `linux/amd64` apenas (Vite/esbuild quebra sob QEMU).
   - Tag dupla: imutavel (`v1.2.3` ou `sha-<short>`) + movel (`prod` ou `hml`).
6. **Bump GitOps** — clona `menufacil-gitops`, edita `apps/<app>/values-{prod,hml}.yaml` na chave `image.tag`, commita com `[skip ci]`, push.

### Roteamento de branches (Git Flow)

| Branch | Trigger | Imagem | Bump GitOps |
|--------|---------|--------|-------------|
| `main` | push + tag `v*` | SemVer (`1.2.3`) | `apps/<app>/values-prod.yaml` |
| `develop` | push | SNAPSHOT (`1.2.3-SNAPSHOT-<sha>`) | `apps/<app>/values-hml.yaml` |
| `feature/*` | PR | `pr-<num>-<sha>` (so build, nao push opcional) | **NAO** bumpa |

### Registry de imagens

- Opcao 1 (recomendada, alinha com smartobra): **Docker Hub** `<org>/menufacil-<app>` se ja existe conta organizacional.
- Opcao 2 (mais moderna): **GHCR** `ghcr.io/<org>/menufacil-<app>` — autenticacao via `GITHUB_TOKEN` automatico, sem credenciais extras.

Decisao recomendada: **GHCR** para repos novos (auth simplificada, integra com GitHub Actions sem secret extra), mantendo a opcao Docker Hub se a equipe ja tiver workflow estabelecido la.

### Workflow PR cross-repo para o GitOps

Apos o build do app:

1. CI clona `menufacil-gitops` usando deploy key SSH (`GITOPS_DEPLOY_KEY` secret).
2. `sed -i` ou `yq` edita a linha `tag: ...` em `apps/<app>/values-<env>.yaml`.
3. Commit + push direto na main do gitops (sem PR — ArgoCD reconcilia em segundos).
4. Mensagem padrao: `chore(<app>): bump <env> to <tag> [skip ci]`.

Alternativa "PR ao inves de push direto" para producao: criar PR no gitops com auto-merge condicionado a aprovacao manual.

### Secrets necessarios em CADA repo de aplicacao (CI)

| Secret | Uso |
|--------|-----|
| `GHCR_USERNAME` / `GHCR_TOKEN` (ou `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN`) | Push da imagem |
| `GITOPS_DEPLOY_KEY` | SSH key para empurrar bump no `menufacil-gitops` |
| `NPM_TOKEN` | Leitura do `@menufacil/shared` no GitHub Packages |
| `VITE_*` (frontends) | Build-time injection das envs publicas |

---

## 6. Versionamento

### Politica

- **SemVer independente por repo.** Cada repo tem seu proprio cadencia de release.
- Format de tag: `v1.2.3` (com prefixo `v`, padrao GitHub).
- Backend: fonte da verdade eh `<revision>` no `pom.xml` (CI-friendly).
- Frontends: fonte da verdade eh `version` no `package.json`.
- Shared: `package.json` — bump dispara publish automatico.

### Compatibility matrix

Manter um arquivo `COMPATIBILITY.md` no `menufacil-infra` documentando combinacoes suportadas:

| Componente | Versao | Requer API | Requer Shared |
|------------|--------|------------|---------------|
| menufacil-api | 1.x | — | ^1.0.0 |
| menufacil-web | 1.x | ^1.0.0 (contrato OpenAPI) | ^1.0.0 |
| menufacil-manager | 1.x | ^1.0.0 | ^1.0.0 |
| menufacil-waiter | 1.x | ^1.0.0 | ^1.0.0 |
| menufacil-desktop | 1.x | ^1.0.0 | ^1.0.0 |

Regra pratica: **breaking change na API = bump major em todo mundo**. Mudancas backward-compatible (novo endpoint, novo campo opcional) = minor sem necessidade de bump dos clients.

### Ferramenta de changelog

Recomendacao: **Release Please** (Google) por repo.
- Configurado em `.github/release-please-config.json`.
- Roda em cada push pra `main`, mantem um PR aberto chamado `chore(main): release <ver>` que atualiza `CHANGELOG.md` + `version` no `package.json/pom.xml`.
- Ao mergear o PR, cria tag + GitHub Release automaticamente.
- Suporta tanto `node` quanto `maven` quanto `simple`.

Alternativa: **changesets** (`@changesets/cli`). Mais flexivel para mono-repos, mas como vamos para multi-repo, Release Please eh mais simples.

---

## 7. Cross-repo dependencies

### A. `@menufacil/shared` via NPM

Ja descrito na secao 3. Resumo do consumo:

```jsonc
// package.json de cada frontend
{
  "dependencies": {
    "@menufacil/shared": "^1.0.0"
  }
}
```

```ini
# .npmrc na raiz de cada repo consumidor
@menufacil:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

### B. Contrato de API (Backend → Frontends)

Duas opcoes complementares:

**Opcao 1 — OpenAPI exportado para `menufacil-shared` (recomendada para producao)**

1. `menufacil-api` (Spring Boot) usa `springdoc-openapi-starter-webmvc-ui` para gerar `/v3/api-docs` em runtime.
2. Workflow em `menufacil-api` apos build: `curl http://localhost:8080/v3/api-docs > openapi.json`.
3. Workflow cria PR no `menufacil-shared` substituindo `openapi/menufacil-api.json` e regerando types com `openapi-typescript`.
4. Apos merge no shared + publish, frontends pegam o novo contrato no proximo bump.

**Opcao 2 — Frontends consomem `/v3/api-docs` direto em dev (apenas DX, nao prod)**

- Em dev local, frontends podem rodar `openapi-typescript http://localhost:8080/v3/api-docs --output src/types/api.d.ts` para iteracao rapida.
- Em prod o contrato sempre vem do `menufacil-shared`.

### C. Backend → Database migrations

- Continua via **Flyway** dentro do proprio Spring Boot (igual smartobra).
- Sem dependencia de outro repo.
- `startupProbe` no Helm chart com 30 failure threshold acomoda migrations longas.

### D. Frontend → Frontend (compartilhamento de componentes UI)

- **NAO** criar um `menufacil-ui` package agora — seria overengineering.
- Cada frontend mantem sua propria `components/ui/`.
- Se padronizacao de UI se tornar dor real (>3 meses pos-split), considerar extrair para `menufacil-ui` como segundo NPM package privado.

---

## 8. Local development setup

### Estrategia recomendada: **compose unico em `menufacil-infra`**

Modelo "git clone tudo num guarda-chuva" igual smartobra:

```
~/Projetos/MaisTech/menufacil-multirepo/
├── menufacil-api/            # clonado
├── menufacil-web/            # clonado
├── menufacil-manager/        # clonado
├── menufacil-waiter/         # clonado
├── menufacil-desktop/        # clonado
├── menufacil-shared/         # clonado (opcional, so se for desenvolver shared)
├── menufacil-gitops/         # clonado
└── menufacil-infra/          # clonado — entry point
    ├── dev/
    │   ├── docker-compose.yml          # postgres + redis + minio + evolution mock
    │   ├── docker-compose.apps.yml     # api + web + manager + waiter (opcional, build local)
    │   └── README.md
    ├── scripts/
    │   ├── bootstrap.sh                # clona todos os repos irmaos
    │   └── pull-all.sh                 # `git pull` em todos os irmaos
    └── docs/
```

### Como funciona

1. Dev clona `menufacil-infra` primeiro.
2. Roda `./scripts/bootstrap.sh` — clona automaticamente os outros 7 repos como irmaos.
3. `cd dev && docker compose up -d postgres redis minio` — sobe so infra.
4. Em cada repo, dev roda nativamente: `cd ../menufacil-api && ./mvnw spring-boot:run`, `cd ../menufacil-web && pnpm dev`, etc.
5. Opcional: `docker compose -f docker-compose.apps.yml up` sobe TUDO em containers (mais lento, mas zero setup).

### Por que NAO compose-por-repo standalone?

- Duplicacao: 5 composes diferentes mantendo postgres/redis em paralelo.
- Sem orquestracao unificada: rodar todos os apps juntos vira manual.
- Conflito de portas em dev se nao houver coordenacao central.

### Servicos no compose dev

| Servico | Porta exposta | Versao |
|---------|--------------|--------|
| postgres | 5432 | 16 |
| redis | 6379 | 7 |
| minio | 9000 (S3) + 9001 (console) | latest |
| evolution-mock (mock WhatsApp) | 8080 | local custom |
| mailhog (mock SMTP) | 1025 + 8025 | latest |

### Variaveis de ambiente

- Cada repo tem seu `.env.example` documentado.
- `menufacil-infra/dev/.env.shared` com URLs comuns (`DATABASE_URL`, `REDIS_URL`, etc.) que devs copiam para seus repos locais.

---

## 9. Ordem de migracao

Prioridade pensada para minimizar bloqueios em cadeia.

### Fase 1 — Fundacao (semana 1-2)

1. **`menufacil-shared`** — extrair primeiro para publicar versao 1.0.0 e desbloquear consumidores.
2. **`menufacil-gitops`** — criar do zero (nao precisa subtree split, eh estrutura nova baseada nos charts do smartobra).
3. **`menufacil-infra`** — montar com compose dev + docs + scripts.

### Fase 2 — Backend (semana 3-4)

4. **`menufacil-api`** — split do `apps/api-java`. Configurar CI/CD + bump no gitops. Validar em HML.

### Fase 3 — Frontends (semana 5-6)

5. **`menufacil-web`** — maior risco/maior valor; cobre admin + storefront.
6. **`menufacil-manager`** — relativamente isolado.
7. **`menufacil-waiter`** — idem.

### Fase 4 — Desktop (semana 7)

8. **`menufacil-desktop`** — Tauri tem build pipeline distinto (releases nativos); migrar por ultimo para nao bloquear o resto.

### Fase 5 — Cleanup (semana 8)

9. Arquivar monorepo original com README de redirecionamento.
10. Aposentar `apps/api` NestJS legado (se ainda nao foi).

---

## 10. Riscos e mitigacoes

| Risco | Probabilidade | Impacto | Mitigacao |
|-------|--------------|---------|-----------|
| **PRs cross-repo (mudanca na API + frontend simultanea)** | Alta | Medio | (1) Versionar contrato OpenAPI no shared; (2) feature flags no backend para evitar acoplamento temporal; (3) script `link-shared.sh` que faz `pnpm link` local em dev |
| **Bug no `@menufacil/shared` paralisa todos os repos** | Media | Alto | (1) CI do shared com testes obrigatorios antes do publish; (2) consumers usam `^1.x` (nao `latest`); (3) rollback simples via `pnpm i @menufacil/shared@1.0.4` |
| **Divergencia de versoes entre repos (ex.: web em React 19, manager em React 18)** | Alta | Baixo | (1) Renovate/Dependabot configurado globalmente; (2) revisao trimestral de dependencias compartilhadas via dashboard |
| **Esquecer de bumpar contrato OpenAPI = frontend chama endpoint que mudou** | Media | Alto | (1) Testes de contrato (Pact ou Schemathesis) em CI da API; (2) types do OpenAPI ficam no shared — quebra de tipo = quebra de build no frontend |
| **Historico Git perdido na migracao** | Baixa | Alto | (1) Usar `git subtree split` (preserva commits); (2) validar `git log --follow` em arquivos-chave; (3) manter monorepo arquivado read-only como backup |
| **Devs novos perdidos sem o monorepo "tudo num lugar"** | Media | Medio | (1) `menufacil-infra/README.md` como entry point unico; (2) `scripts/bootstrap.sh` clona tudo; (3) ADR documentando a decisao |
| **CI/CD multiplicado = custo de manutencao maior** | Alta | Medio | (1) Reusable workflows do GitHub Actions (`workflow_call`) centralizados em `menufacil-infra/.github/workflows/`; (2) Template repo para criar novos servicos |
| **`menufacil-shared` quebrado em CI dos consumers porque NPM_TOKEN expirou** | Media | Alto | (1) Token de PAT classico sem expiracao OU GitHub App; (2) monitoramento via Renovate (falha logo aparece); (3) registry self-hosted como plano B |
| **Migracao prolongada vira "monorepo + multi-repo" no meio** | Media | Alto | (1) Time-box rigido (8 semanas); (2) freeze de features novas durante a migracao; (3) ordem de fase 1→5 nao pula etapas |
| **Secrets em plaintext no gitops (mesmo padrao smartobra hoje)** | Alta | Alto | Migrar para **SealedSecrets** ou **External Secrets Operator** antes de declarar producao pronta. Nao replicar a divida do smartobra. |
| **Aposentar `apps/api` (NestJS legado) tem feature ainda nao portada para Java** | Media | Critico | Auditoria de endpoints do NestJS x Java ANTES de iniciar fase 4. Backlog explicito de gaps de paridade. |

---

## 11. Checklist de execucao

### Pre-migracao

- [ ] Criar/confirmar org no GitHub (`<org>` = `maistechtecnologia` ou `alphatechia`)
- [ ] Confirmar quem tem permissao admin para criar repos na org
- [ ] Decidir registry de imagens: GHCR vs Docker Hub (recomendado: GHCR)
- [ ] Decidir registry npm: GitHub Packages vs Verdaccio self-hosted (recomendado: GitHub Packages)
- [ ] Gerar `GITOPS_DEPLOY_KEY` SSH e adicionar como Deploy Key (write) no `menufacil-gitops`
- [ ] Gerar `NPM_TOKEN` (PAT classico com `read:packages`) — adicionar como secret de org no GitHub
- [ ] Auditoria de paridade `apps/api` (NestJS) vs `apps/api-java` (Spring) — documentar gaps
- [ ] Comunicar plano para o time (ADR + reuniao kickoff)
- [ ] Freeze de novas features durante a migracao (negociar janela de 8 semanas)

### Fase 1 — Fundacao

- [ ] Criar repo `menufacil-shared` vazio no GitHub
- [ ] Subtree split: `git subtree split --prefix=packages/shared -b split-shared`
- [ ] Push para `menufacil-shared:main`
- [ ] Configurar `.github/workflows/publish.yml` (publish em tag `v*`)
- [ ] Publicar `@menufacil/shared@1.0.0` no GitHub Packages
- [ ] Configurar Release Please no `menufacil-shared`
- [ ] Criar repo `menufacil-gitops` vazio
- [ ] Copiar/adaptar `charts/backend/` e `charts/static-frontend/` do smartobra para o gitops
- [ ] Criar `apps/menufacil-api/values-{prod,hml}.yaml` placeholders
- [ ] Criar `apps/menufacil-web/values-{prod,hml}.yaml` placeholders
- [ ] Criar `apps/menufacil-manager/values-{prod,hml}.yaml` placeholders
- [ ] Criar `apps/menufacil-waiter/values-{prod,hml}.yaml` placeholders
- [ ] Adicionar `README.md` no gitops explicando fluxo
- [ ] Criar repo `menufacil-infra` vazio
- [ ] Migrar `docker-compose.yml` para `menufacil-infra/dev/`
- [ ] Migrar `docs/DEPLOY.md` e `docs/plans/` para `menufacil-infra/docs/`
- [ ] Criar `scripts/bootstrap.sh` que clona os repos irmaos
- [ ] Criar `COMPATIBILITY.md` inicial
- [ ] Criar Application CRs no repo `alphatech-infra-gitops` (ou equivalente) apontando para `menufacil-gitops`

### Fase 2 — Backend

- [ ] Criar repo `menufacil-api` vazio
- [ ] Subtree split: `git subtree split --prefix=apps/api-java -b split-api`
- [ ] Push para `menufacil-api:main`
- [ ] Validar `git log --oneline` (historico preservado)
- [ ] Atualizar `pom.xml` removendo referencias a workspace
- [ ] Adicionar `springdoc-openapi-starter-webmvc-ui` se ainda nao tiver
- [ ] Criar `Dockerfile` multi-stage seguindo padrao smartobra (multi-arch buildx)
- [ ] Criar `.github/workflows/ci.yml` (build, test, docker push, gitops bump)
- [ ] Configurar secrets do repo (`GHCR_TOKEN`, `GITOPS_DEPLOY_KEY`, `NPM_TOKEN`)
- [ ] Configurar Release Please para Maven
- [ ] Primeiro deploy em HML — validar saude via `/actuator/health`
- [ ] Validar contrato OpenAPI exposto em `/v3/api-docs`
- [ ] Criar workflow auxiliar que exporta OpenAPI para PR no `menufacil-shared`

### Fase 3 — Frontends

- [ ] Criar repo `menufacil-web` vazio
- [ ] Subtree split + push (`apps/web`)
- [ ] Atualizar `package.json` removendo workspace, instalando `@menufacil/shared` do registry
- [ ] Criar `.npmrc` com `@menufacil:registry=https://npm.pkg.github.com`
- [ ] Copiar `Dockerfile` Vite + nginx-unprivileged do smartobra
- [ ] Copiar `nginx.conf` do smartobra (com `/config.js` runtime config)
- [ ] Criar `src/lib/config.ts` runtime loader + `public/config.js` placeholder
- [ ] Criar `.github/workflows/ci.yml`
- [ ] Configurar secrets
- [ ] Primeiro deploy em HML
- [ ] Repetir para `menufacil-manager`
- [ ] Repetir para `menufacil-waiter`

### Fase 4 — Desktop

- [ ] Criar repo `menufacil-desktop` vazio
- [ ] Subtree split + push (`apps/desktop`)
- [ ] Migrar `scripts/bump-desktop.sh` para o novo repo
- [ ] Configurar build Tauri em GitHub Actions (matrix windows/macos/linux)
- [ ] Configurar release com binarios anexados ao GitHub Release
- [ ] Validar QZ Tray integration ainda funciona

### Fase 5 — Cleanup

- [ ] Validar todos os repos em HML (smoke test end-to-end)
- [ ] Validar todos os repos em PROD (cutover semana 8)
- [ ] PR no monorepo original removendo `apps/`, `packages/`, `k8s/`
- [ ] Substituir `README.md` do monorepo por aviso de redirecionamento
- [ ] Arquivar monorepo no GitHub (Settings → Archive)
- [ ] Aposentar `apps/api` (NestJS) — confirmar zero trafego antes
- [ ] Atualizar documentacao em `menufacil-infra/docs/` com URLs dos novos repos
- [ ] Comunicar conclusao da migracao para o time
- [ ] Retrospectiva e ADR final

### Pos-migracao (gaps a fechar)

- [ ] Migrar secrets do `values-*.yaml` plaintext para **SealedSecrets** ou **External Secrets Operator**
- [ ] Adicionar **HPA** nos Deployments de producao
- [ ] Adicionar **PodDisruptionBudget** quando subir para 2+ replicas
- [ ] Adicionar **NetworkPolicy** restringindo trafego entre namespaces
- [ ] Adicionar `micrometer-registry-prometheus` no backend + ServiceMonitor
- [ ] Adicionar **Sentry** nos frontends
- [ ] Adicionar **Loki + Promtail** para agregacao de logs
- [ ] Configurar **Renovate** ou **Dependabot** em todos os repos

---

## Apendice A — Referencias

- Padrao SmartObra360: `/Users/mesquitadev/Projetos/MaisTech/smartobra360/` (guia tecnico no contexto desta sessao).
- Tabela de arquivos chave reutilizaveis: ver secao 9 do guia smartobra original.
- Monorepo atual MenuFacil: `/Users/mesquitadev/Projetos/MaisTech/menufacil/`.

## Apendice B — Decisoes em aberto

Pontos que precisam de decisao explicita antes de iniciar a Fase 1:

1. Registry de imagens: **GHCR** (recomendado) vs Docker Hub.
2. Registry npm: **GitHub Packages** (recomendado) vs Verdaccio self-hosted.
3. CI: manter **GitHub Actions** (recomendado, ja em uso) vs migrar para Jenkins (alinhar 100% com smartobra).
4. Tag prefix: `v1.2.3` (recomendado, padrao GitHub) vs `1.2.3` sem prefixo (smartobra).
5. Branch strategy: **Git Flow** (`main` + `develop`) replicando smartobra vs Trunk-based com tags.
6. Application CRs do ArgoCD: confirmar repo de infra compartilhado existente para hostear (`alphatech-infra-gitops`?).
7. Aposentar `apps/api` NestJS: timeline e responsavel pela auditoria de paridade com `api-java`.

