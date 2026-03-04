FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/customer/package.json apps/customer/tsconfig.json apps/customer/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src packages/shared/src
COPY apps/customer/ apps/customer/

RUN pnpm --filter @menufacil/shared build
RUN pnpm --filter customer build

# --- Nginx ---
FROM nginx:alpine
COPY apps/customer/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/customer/dist /usr/share/nginx/html
EXPOSE 80

CMD ["/bin/sh", "-c", "sed -i \"s|__API_URL__|${API_URL:-http://api:3000}|g\" /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
