FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/admin/package.json apps/admin/tsconfig.json apps/admin/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src packages/shared/src
COPY apps/admin/ apps/admin/

RUN pnpm --filter @menufacil/shared build
RUN pnpm --filter admin build

# --- Nginx ---
FROM nginx:alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80

CMD ["/bin/sh", "-c", "\
  sed -i \"s|__API_URL__|${API_URL:-http://api:3000}|g\" /etc/nginx/conf.d/default.conf && \
  echo \"window.__RUNTIME_CONFIG__ = { CUSTOMER_URL: '${CUSTOMER_URL:-}' };\" > /usr/share/nginx/html/runtime-config.js && \
  nginx -g 'daemon off;'"]
