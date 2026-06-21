# MenuFacil — Infra K8s + GitOps + CI/CD

Replica do padrao SmartObra360 adaptado pro MenuFacil. Estrutura split-friendly:
cada servico pode virar repo proprio sem refatorar manifests/charts.

## Arvore

```
infra/
  docker/
    api-java/{Dockerfile}
    web/{Dockerfile,nginx.conf}
    manager/{Dockerfile,nginx.conf}
    waiter/{Dockerfile,nginx.conf}
  charts/
    backend/             # Spring Boot — Deployment, Service, Ingress, ConfigMap, Secret, HPA, PDB, ServiceMonitor, Namespace
    static-frontend/     # SPA nginx — Deployment, Service, Ingress, ConfigMap (config.js), HPA, PDB
  apps/
    menufacil-api-java/  # values-{prod,hml}.yaml
    menufacil-web/
    menufacil-manager/
    menufacil-waiter/
  argocd/
    projects/menufacil.yaml
    apps/{api-java,web,manager,waiter}-{prod,hml}.yaml

.github/workflows/
  {api-java,web,manager,waiter}-ci.yml   # PR/push: build+test+helm lint
  {api-java,web,manager,waiter}-cd.yml   # main/develop: build->push GHCR->bump values
```

## Convencoes

- **Versionamento:** `main` -> SemVer puro do `pom.xml`/`package.json`; `develop` -> `<base>-SNAPSHOT-<sha>`.
- **Branches:** Git Flow. Feature branches **nao** bumpam GitOps.
- **Registry:** `ghcr.io/maistech/menufacil-<componente>`.
- **Namespaces:** `menufacil` (prod), `menufacil-hml` (hml). Backend declara o Namespace; frontends usam `CreateNamespace=true` como rede.
- **Domains:** `api.menufacil.maistechtecnologia.com.br`, `app.*`, `manager.*`, `waiter.*` (prod) + `api.hml.*` (hml).
- **TLS:** cert-manager + ClusterIssuer `letsencrypt-prod`. Secrets `menufacil-<app>-tls`.
- **Labels:** `app.kubernetes.io/{name,part-of,component,managed-by}` em todos os recursos.

## Diferencas vs SmartObra360

Adicoes (gaps que o smartobra ainda nao tem):
- **HPA** (backend 2-10, frontends 2-5) por CPU/memoria.
- **PodDisruptionBudget** (`minAvailable: 1`).
- **ServiceMonitor** (Prometheus Operator) — flag opcional, requer `micrometer-registry-prometheus` no pom.
- **checksum/config + checksum/secret** annotations no Deployment — recria pods quando ConfigMap/Secret mudam.

Mantido fiel:
- securityContext nonRoot + readOnlyRootFS + drop ALL.
- automountServiceAccountToken: false.
- emptyDirs em /tmp, /var/cache/nginx, /var/run.
- RollingUpdate maxSurge:1, maxUnavailable:0.
- Runtime config dos SPAs via `/config.js` (ConfigMap), nao rebuild.

## Como subir do zero no cluster

```bash
# 1) Pre-requisitos no cluster (uma vez):
#    - ingress-nginx instalado
#    - cert-manager instalado + ClusterIssuer letsencrypt-prod
#    - argo-cd instalado no namespace argocd
#    - GHCR puxando imagens (imagePullSecret se repo privado)

# 2) Aplica o AppProject e Applications:
kubectl apply -f infra/argocd/projects/menufacil.yaml
kubectl apply -f infra/argocd/apps/api-java-prod.yaml
kubectl apply -f infra/argocd/apps/web-prod.yaml
kubectl apply -f infra/argocd/apps/manager-prod.yaml
kubectl apply -f infra/argocd/apps/waiter-prod.yaml

# 3) Force sync inicial (opcional, syncPolicy.automated ja cuida):
argocd app sync menufacil-api-java-prod
```

## Pendencias / proximos passos

1. **Secrets em plaintext nos values** — divida tecnica herdada do smartobra. Migrar para SealedSecrets (`bitnami-labs/sealed-secrets`) ou External Secrets Operator (apontando para AWS Secrets Manager / HashiCorp Vault).
2. **DNS** — apontar `*.menufacil.maistechtecnologia.com.br` e `*.hml.menufacil.maistechtecnologia.com.br` para o LoadBalancer do ingress-nginx.
3. **NetworkPolicy** — ainda nao adicionado; ideal para isolar tenants e bloquear egress nao necessario.
4. **`micrometer-registry-prometheus`** — adicionar no `pom.xml` + `prometheus` em `management.endpoints.web.exposure.include` antes de ligar `serviceMonitor.enabled: true`.
5. **Sentry no frontend** — nao incluido no MVP da infra (espelha o que smartobra tem hoje).
6. **Logs** — sem Loki/Promtail; logs em stdout via `kubectl logs`.
7. **GitOps split** — se virar repo separado (recomendado), trocar `repoURL` nas Applications + ajustar `gitops-update` job no CD pra clonar e empurrar para o novo repo via deploy key (ver Jenkinsfile do smartobra como referencia).
8. **Token do CD** — opcionalmente criar `secrets.GITOPS_TOKEN` (PAT com `repo` scope) para o job `gitops-update`. Sem ele, usa o `GITHUB_TOKEN` default (so funciona se for mesmo repo).
9. **Imagens privadas no GHCR** — criar `imagePullSecret` no namespace e referenciar no `serviceAccountName` ou em `spec.template.spec.imagePullSecrets` do Deployment, OU tornar os pacotes GHCR publicos.
10. **Migrations Flyway** — hoje rodam dentro do proprio Spring no boot. Se ficarem longas, considerar Helm hook `pre-install`/`pre-upgrade` com Job dedicado.

## Split em multiplos repos (futuro)

Cada `apps/<componente>` ja eh isolado o suficiente. Para split:
1. Mover `apps/api-java/` para repo proprio + `infra/docker/api-java` + `infra/charts/backend` + `infra/apps/menufacil-api-java/` + workflow `api-java-cd.yml`.
2. Criar repo `menufacil-gitops` central contendo so `infra/charts/` + `infra/apps/` + `infra/argocd/`.
3. Workflows CD passam a fazer clone via SSH deploy key (igual smartobra: `git@github.com:MaisTech/menufacil-gitops.git`).
4. Application CRs apontam `repoURL: https://github.com/MaisTech/menufacil-gitops`.
