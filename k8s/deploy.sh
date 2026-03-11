#!/bin/bash
set -e

REGISTRY="${REGISTRY:-menufacil}"
TAG="${TAG:-latest}"

echo "=== MenuFacil Kubernetes Deploy ==="
echo "Registry: $REGISTRY"
echo "Tag: $TAG"

# 1. Build and push images
echo ""
echo "--- Building Docker images ---"
for app in api web super-admin waiter; do
  echo "Building $app..."
  docker build -t "$REGISTRY/$app:$TAG" -f "apps/$app/Dockerfile" .
  docker push "$REGISTRY/$app:$TAG"
done

# 2. Apply Kubernetes manifests
echo ""
echo "--- Applying Kubernetes manifests ---"

# Namespace first
kubectl apply -f k8s/base/namespace.yaml

# Config and secrets
kubectl apply -f k8s/base/configmap.yaml
kubectl apply -f k8s/base/secrets.yaml

# Infrastructure
kubectl apply -f k8s/infra/postgres.yaml
kubectl apply -f k8s/infra/redis.yaml
kubectl apply -f k8s/infra/minio.yaml

echo "Waiting for infra to be ready..."
kubectl -n menufacil wait --for=condition=ready pod -l app=postgres --timeout=120s
kubectl -n menufacil wait --for=condition=ready pod -l app=redis --timeout=60s
kubectl -n menufacil wait --for=condition=ready pod -l app=minio --timeout=60s

# Applications
kubectl apply -f k8s/apps/api.yaml
kubectl apply -f k8s/apps/web.yaml
kubectl apply -f k8s/apps/super-admin.yaml
kubectl apply -f k8s/apps/waiter.yaml

# Ingress & TLS
kubectl apply -f k8s/base/cert-issuer.yaml
kubectl apply -f k8s/base/ingress.yaml

echo ""
echo "--- Waiting for apps to be ready ---"
kubectl -n menufacil wait --for=condition=ready pod -l app=api --timeout=120s
kubectl -n menufacil wait --for=condition=ready pod -l app=web --timeout=60s

echo ""
echo "=== Deploy complete! ==="
kubectl -n menufacil get pods
