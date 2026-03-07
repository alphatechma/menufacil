FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/waiter/package.json apps/waiter/tsconfig.json apps/waiter/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src packages/shared/src
COPY apps/waiter/ apps/waiter/

RUN pnpm --filter @menufacil/shared build
RUN pnpm --filter @menufacil/waiter build

# --- Nginx ---
FROM nginx:alpine
COPY apps/waiter/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/waiter/dist /usr/share/nginx/html
EXPOSE 80

COPY apps/waiter/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
