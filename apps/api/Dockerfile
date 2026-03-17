FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/tsconfig.json packages/shared/
COPY apps/api/package.json apps/api/tsconfig.json apps/api/nest-cli.json apps/api/

RUN pnpm install --frozen-lockfile

COPY packages/shared/src packages/shared/src
COPY apps/api/src apps/api/src

RUN pnpm --filter @menufacil/shared build
RUN pnpm --filter api build

# --- Production ---
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --prod

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/certs/digital-certificate.txt apps/api/certs/

ENV NODE_ENV=production
ENV API_PORT=3000
EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
