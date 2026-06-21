# syntax=docker/dockerfile:1.7
# Dockerfile do menufacil-manager (super admin panel — React + Vite SPA).
# Mesmo padrao do web: build com BUILDPLATFORM nativo + nginx-unprivileged.

FROM --platform=$BUILDPLATFORM node:20-alpine AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/manager/package.json apps/manager/tsconfig.json apps/manager/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src packages/shared/src
COPY apps/manager/ apps/manager/

RUN pnpm --filter @menufacil/shared build \
 && pnpm --filter manager build

FROM nginxinc/nginx-unprivileged:1.27-alpine

ARG APP_VERSION=0.0.1
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown
LABEL org.opencontainers.image.title="menufacil-manager" \
      org.opencontainers.image.vendor="MaisTech" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

COPY infra/docker/manager/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/manager/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
