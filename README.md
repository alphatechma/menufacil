  ---
  Deploy no Easypanel - Passo a Passo

  1. Push pro GitHub

  git push origin main

  2. No Easypanel, criar 4 servicos no mesmo projeto

  Vai em Project > + New Service > App para cada um:

  ---
  Servico 1: api

  - Source: GitHub → alphatechma/menufacil
  - Branch: main
  - Build: Dockerfile
  - Dockerfile Path: apps/api/Dockerfile
  - Port: 3000
  - Domain: api.seudominio.com.br (ou o que preferir)

  Environment Variables:
  NODE_ENV=production
  API_PORT=3000
  API_PREFIX=api
  DB_HOST=mesquitadev_clients-db
  DB_PORT=5432
  DB_USERNAME=doadmin
  DB_PASSWORD=7142a0ac3d2deeb33d66
  DB_DATABASE=clients
  REDIS_HOST=mesquitadev_redis
  REDIS_PORT=6379
  REDIS_PASSWORD=maistech1
  JWT_SECRET=gerar-um-secret-forte-aqui-32-chars
  JWT_EXPIRES_IN=15m
  JWT_REFRESH_SECRET=gerar-outro-secret-forte-aqui-32
  JWT_REFRESH_EXPIRES_IN=7d
  MINIO_ENDPOINT=localhost
  MINIO_PORT=9000
  MINIO_ACCESS_KEY=menufacil
  MINIO_SECRET_KEY=menufacil123
  MINIO_BUCKET=menufacil
  MINIO_USE_SSL=false

  ---
  Servico 2: customer

  - Source: GitHub → alphatechma/menufacil
  - Branch: main
  - Build: Dockerfile
  - Dockerfile Path: apps/customer/Dockerfile
  - Port: 80
  - Domain: app.seudominio.com.br (vitrine do cliente)

  Environment Variables:
  API_URL=http://api:3000

  ---
  Servico 3: admin

  - Source: GitHub → alphatechma/menufacil
  - Branch: main
  - Build: Dockerfile
  - Dockerfile Path: apps/admin/Dockerfile
  - Port: 80
  - Domain: admin.seudominio.com.br

  Environment Variables:
  API_URL=http://api:3000

  Build Arguments (em Advanced > Build Args):
  VITE_CUSTOMER_URL=https://app.seudominio.com.br

  ---
  Servico 4: manager

  - Source: GitHub → alphatechma/menufacil
  - Branch: main
  - Build: Dockerfile
  - Dockerfile Path: apps/manager/Dockerfile
  - Port: 80
  - Domain: super.seudominio.com.br

  Environment Variables:
  API_URL=http://api:3000

  ---
  3. Ordem de deploy

  1. api primeiro (esperar ficar verde)
  2. customer, admin, manager (podem ir em paralelo)

  4. Apos o deploy da API, rodar o seed

  No Easypanel, vai no servico api > Terminal e roda:

  node apps/api/dist/database/seeds/run-seed.js

  Ou, se o seed nao estiver compilado no dist, voce pode rodar direto no banco via o pgAdmin/psql.

  ---
  Obs importantes

  - O API_URL=http://api:3000 usa a rede interna do Docker — o nome api e o nome do servico no Easypanel
  - Se voce der outro nome pro servico da API (ex: menufacil-api), ajuste o API_URL nos frontends
  - Os dominios no Easypanel ja tem HTTPS automatico via Let's Encrypt
  - Tudo roda na porta 80 externamente (Traefik do Easypanel cuida disso)