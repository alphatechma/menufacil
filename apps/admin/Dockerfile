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

COPY apps/admin/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
