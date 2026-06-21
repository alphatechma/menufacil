# syntax=docker/dockerfile:1.7
#
# Dockerfile do menufacil-web (React + Vite SPA).
# Padrao baseado em smartobra360-web:
#   - Stage de build em --platform=$BUILDPLATFORM (evita QEMU emular esbuild
#     quando o agent for ARM e a target amd64 — esbuild quebra sob emulacao).
#   - Runtime: nginx-unprivileged (UID 101, porta 8080, sem root).
#   - Suporta runtime config via /config.js (sobrescrito por ConfigMap em prod)
#     com fallback para os VITE_* injetados em build-time.
#
# Build local:
#   docker build -f infra/docker/web/Dockerfile -t menufacil-web:dev .
#
# Context = raiz do monorepo (precisa de pnpm-workspace + packages/shared).

FROM --platform=$BUILDPLATFORM node:20-alpine AS build

WORKDIR /app

# Habilita pnpm via corepack (sem instalar global).
RUN corepack enable && corepack prepare pnpm@10 --activate

# Envs de build-time. Em prod o /config.js (ConfigMap) sobrepoe sem rebuild.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Copia manifestos primeiro (cache de layer enquanto deps nao mudam).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/web/package.json apps/web/tsconfig.json apps/web/

RUN pnpm install --frozen-lockfile

# Source completo.
COPY packages/shared/src packages/shared/src
COPY apps/web/ apps/web/

# Build do shared antes do app.
RUN pnpm --filter @menufacil/shared build \
 && pnpm --filter web build

# ===== Runtime =====
FROM nginxinc/nginx-unprivileged:1.27-alpine

ARG APP_VERSION=0.0.1
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="menufacil-web" \
      org.opencontainers.image.vendor="MaisTech" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

COPY infra/docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
