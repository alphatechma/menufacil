# syntax=docker/dockerfile:1.7
#
# Dockerfile do menufacil-api-java (Spring Boot 3.3 / Java 21).
# Padrao baseado em smartobra360-backend:
#   - Multi-stage com Maven layered jar (melhor cache em rebuild).
#   - Runtime sobre eclipse-temurin JRE alpine, usuario nao-root (1000:1000).
#   - HEALTHCHECK em /api/actuator/health.
#   - Labels OCI populadas via ARG injetadas pelo CI.
#
# Build:
#   docker build -f infra/docker/api-java/Dockerfile -t menufacil-api-java:dev apps/api-java
#
# Os ARGs APP_VERSION/VCS_REF/BUILD_DATE sao opcionais — CI passa via --build-arg.

# ===== Stage 1: Build =====
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Resolve deps primeiro (cache de layer enquanto o src nao muda).
COPY pom.xml ./
RUN mvn -B -e -ntp dependency:go-offline

# Build + extracao das camadas Spring Boot.
COPY src ./src
RUN set -eux \
 && mvn -B -e -ntp -DskipTests clean package \
 && mkdir -p target/extracted \
 && for jar in target/*.jar; do \
        case "${jar}" in *-plain.jar) continue ;; esac; \
        java -Djarmode=layertools -jar "${jar}" extract --destination target/extracted; \
        break; \
    done

# ===== Stage 2: Runtime =====
FROM eclipse-temurin:21.0.5_11-jre-alpine AS runtime

ARG APP_VERSION=0.1.0-SNAPSHOT
ARG VCS_REF=unknown
ARG BUILD_DATE=unknown

LABEL org.opencontainers.image.title="menufacil-api-java" \
      org.opencontainers.image.description="MenuFacil API (Spring Boot 3.3, multi-tenant)" \
      org.opencontainers.image.vendor="MaisTech" \
      org.opencontainers.image.source="https://github.com/MaisTech/menufacil" \
      org.opencontainers.image.version="${APP_VERSION}" \
      org.opencontainers.image.revision="${VCS_REF}" \
      org.opencontainers.image.created="${BUILD_DATE}"

# Non-root.
RUN addgroup -g 1000 spring && adduser -D -u 1000 -G spring spring

WORKDIR /app

# Layered jar — copia da camada mais estavel pra mais volatil.
COPY --from=builder --chown=spring:spring /build/target/extracted/dependencies/ ./
COPY --from=builder --chown=spring:spring /build/target/extracted/spring-boot-loader/ ./
COPY --from=builder --chown=spring:spring /build/target/extracted/snapshot-dependencies/ ./
COPY --from=builder --chown=spring:spring /build/target/extracted/application/ ./

USER spring:spring

ENV API_PORT=3001 \
    JAVA_TOOL_OPTIONS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom -Duser.timezone=America/Sao_Paulo"

EXPOSE 3001

# context-path do Spring eh /api, entao o actuator vive em /api/actuator/health.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${API_PORT}/api/actuator/health" | grep -q '"status":"UP"' || exit 1

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
