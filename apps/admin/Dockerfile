FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/admin/package.json apps/admin/tsconfig.json apps/admin/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src packages/shared/src
COPY apps/admin/ apps/admin/

ARG VITE_CUSTOMER_URL=""
ENV VITE_CUSTOMER_URL=$VITE_CUSTOMER_URL

RUN pnpm --filter @menufacil/shared build
RUN pnpm --filter admin build

# --- Nginx ---
FROM nginx:alpine
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
EXPOSE 80

CMD ["/bin/sh", "-c", "sed -i \"s|__API_URL__|${API_URL:-http://api:3000}|g\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
