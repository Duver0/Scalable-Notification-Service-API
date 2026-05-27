# Skill: Docker Best Practices

## Purpose
Define a consistent Docker strategy for the project: multi-stage builds, image optimization, layer caching, security hardening, and local development with Docker Compose.

## Rules

### Multi-Stage Dockerfile
```dockerfile
# ---- Bun Install (dependencies) ----
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---- Build (compile TypeScript) ----
FROM deps AS build
COPY . .
RUN bun run build

# ---- Production (minimal image) ----
FROM oven/bun:1-slim AS production
WORKDIR /app
RUN addgroup --system app && adduser --system --group app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json .
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun run dist/health.js || exit 1
CMD ["bun", "run", "dist/main.js"]
```

### Image Rules
1. **Always pin base image versions**: `bun:1-slim@sha256:...` not `bun:latest`
2. **Use `COPY --chown`** for permission hardening
3. **Never run as root** in the production container
4. **One process per container**: don't run a process manager inside the container
5. **`.dockerignore` node_modules, .git, .env, test files, and local configs**

### Docker Compose for Development
```yaml
services:
  api:
    build:
      context: .
      target: deps
    volumes:
      - .:/app
      - /app/node_modules
    ports:
      - "3000:3000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
  postgres:
    image: postgis/postgis:16-3.4-alpine
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
```

## Anti-Patterns
- Installing build tools (curl, git, gcc) in the production stage
- Using `apt-get upgrade` or `apk upgrade` (immutable base image, rebuild from patched base)
- Baking environment-specific config into the image (use env vars at runtime)
- COPY `node_modules` from local to the image
- Using `:latest` tag in production deployments
- Running database migrations in the container's CMD (use a separate init container or CI step)

## Best Practices
- Use `.dockerignore` aggressively: keep the build context small (<50MB)
- Order Dockerfile instructions from least to most frequently changing layers for maximum cache reuse
- Label images with `org.opencontainers.image.source` pointing to the repository
- Set `NODE_ENV=production` in the production stage so NestJS strips dev dependencies
- Use `docker scout` or Trivy to scan images for vulnerabilities before pushing
- Define resource limits in docker-compose: `deploy.resources.limits.cpus: '1'`
