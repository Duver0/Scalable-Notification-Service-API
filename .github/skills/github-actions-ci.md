# Skill: GitHub Actions CI/CD

## Purpose
Define the CI/CD pipeline. Every commit triggers linting, type checking, testing, building, security scanning, and (on main) deployment. The pipeline is fast, reliable, and provides clear feedback.

## Pipeline Overview

### Workflow: `ci.yml` (Pull Request & Push to main)
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run lint
      - run: bun run format:check

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        ports: [5432:5432]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        ports: [6379:6379]
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run test:ci
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-report
          path: reports/

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun audit
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'

  build:
    needs: [lint, typecheck, test, security]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - run: bun install --frozen-lockfile
      - run: bun run build
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.ref == 'refs/heads/main' }}
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }},ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

### Workflow Rules
1. **Fail fast**: lint and typecheck run first. If they fail, cancel the rest.
2. **Parallel where possible**: test, security scan, and build can run after lint/typecheck pass.
3. **Dependency caching**: cache `~/.bun/install/cache` and Docker layers between runs.
4. **No secrets in logs**: ensure all commands that might echo secrets are silenced.
5. **Test containers**: use GitHub service containers for PostgreSQL and Redis rather than Testcontainers in CI (faster, more reliable).
6. **Conditional deployment**: only build AND push Docker image on main branch pushes.
7. **Notify on failure**: configure `run-name` and GitHub commit status checks for every job.

## Anti-Patterns
- Running lint, test, and build in a single monolithic job (slow, no parallelization)
- Including secrets in the pipeline YAML (use GitHub Secrets)
- Skipping security scanning to speed up CI
- Building Docker images without cache (slow and wasteful)
- Running E2E tests that require a full production-like environment in CI
- Allowing CI to pass with warnings or type errors turned off

## Best Practices
- Use `concurrency` to cancel redundant runs on the same branch
- Set `timeout-minutes` on every job (default 360 is too long)
- Upload test reports and coverage reports as artifacts for debugging
- Use `dorny/test-reporter` to surface test results directly on PRs
- Pin action versions by SHA in addition to major version tag
- Use `github.event_name == 'pull_request'` checks to conditionally skip expensive steps on drafts
- Add a `deploy` job (manually triggered or auto on main) that uses `deploy` environment with required reviewers
