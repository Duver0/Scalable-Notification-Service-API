# Scalable Notification Service API

## Project Overview and Vision
The goal is to build a professional-grade backend using NestJS and TypeScript, focusing on an ASDD (Architecture Supported Domain-Driven Design) approach. This is not a basic CRUD application, but rather a robust system designed to demonstrate real-world knowledge in backend architecture, design patterns, modularity, scalability, and modern best practices.

## Tech Stack
- **Backend:** NestJS, TypeScript
- **Package Manager / Development:** Bun
- **Production Runtime:** Node.js
- **Database:** PostgreSQL
- **Message Broker / Cache:** Redis (using BullMQ for job queues)
- **Infrastructure:** Docker, Docker Compose
- **Quality Assurance:** ESLint, Prettier, Husky, Jest (Unit & E2E Testing)
- **Patterns & Principles:** Microservices, Clean Architecture, Monorepo topology, Event-Driven architecture, SOLID principles

## Architecture Summary
The system is built as a Microservices Architecture orchestrated within a single NestJS Monorepo, optimizing code sharing and developer workflow while maintaining strict deployment boundaries.

### Microservices
* **`api-gateway` (HTTP REST API)**
  * **Role:** The public HTTP entry point.
  * **Responsibilities:** Handles IAM authentication, exacts JWT validation, and producer logic to enqueue messages to Redis. 
  * **Behavior:** Operates asynchronously, returning a `202 Accepted` immediately upon enqueueing a task. It shares the database for essential inserts like tracking starting job states.
* **`notification-worker` (Headless Microservice)**
  * **Role:** Background processor and sending engine.
  * **Responsibilities:** Subscribes to Redis queues, handles third-party communications (SMTP, Twilio), and manages complex retry (Exponential Backoff) policies and heavy workloads.
  * **Behavior:** Emits events with the final status of operations. It executes deduplication logic and controls the business rule templates.

### Monorepo Topology
* **`apps/api-gateway/`**: The web-facing HTTP server.
* **`apps/notification-worker/`**: Background worker process.
* **`libs/`**: A shared module directory containing reusable NestJS modules. Includes `common` (DTOs, Enums), `logger` (structured logging setup), and `redis-client`.

## Getting Started (Phase 0 Setup)

These instructions will guide you through setting up, building, and running the base infrastructure strictly using Bun and Docker Compose.

### Prerequisites
* [Bun](https://bun.sh/)
* [Docker](https://docs.docker.com/get-docker/) & Docker Compose

### Running the Project Locally

1. **Install Dependencies:**
   Install the necessary modules through Bun at the root of the monorepo.
   ```bash
   bun install
   ```

2. **Start Infrastructure Dependencies:**
   Provision the PostgreSQL and Redis containers using Docker Compose. For local development, **only** start the infrastructure services so you can run the apps directly utilizing Hot-Reloading.
   ```bash
   docker compose up -d postgres redis
   ```

3. **Run the Microservices (Development Mode):**
   Open two separate terminal instances to start both services concurrently in watch mode.

   *Terminal 1 - API Gateway:*
   ```bash
   bun run start:dev api-gateway
   ```

   *Terminal 2 - Notification Worker (Runs on local port 3001):*
   ```bash
   bun run start:dev notification-worker
   ```

4. **Tear Down:**
   To stop and remove the locally running containers:
   ```bash
   docker compose down
   ```

### Docker-only Development (Dev Profile)

If you prefer running everything inside containers (including the apps with hot-reload), use the Docker Compose `dev` profile. This starts `api-gateway` and `notification-worker` in containers using the `oven/bun` image and mounts the repository for live reload.

1. **Start all services (including apps) in dev mode:**
```bash
docker compose --profile dev up --build
```

2. **Access endpoints:**
- API Gateway: http://localhost:3000
- Notification Worker health: http://localhost:3001/health
- Notification Worker metrics (Prometheus): http://localhost:3001/metrics

Notes:
- The Compose file provides two profiles: `dev` (hot-reload containers using `oven/bun`) and `prod` (built images from Dockerfiles).
- To avoid port conflicts, the built services are in the `prod` profile. Running `--profile dev` will start only the `dev` containers plus infra (redis/postgres).

To run the built images (production-style) with ports exposed use:
```bash
docker compose --profile prod up --build
```

Use the `dev` profile when you want a Docker-only development workflow without installing Bun locally.
