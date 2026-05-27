# Scalable Notification Service API - Architecture Specification

## 1. Visión General del Proyecto
El objetivo es construir un backend profesional utilizando NestJS y TypeScript con un enfoque ASDD (Architecture Supported Domain-Driven Design). No es un CRUD básico, sino un sistema para demostrar conocimientos reales en arquitectura backend, patrones de diseño, modularidad, escalabilidad y buenas prácticas modernas.

**Arquitectura Seleccionada:** Arquitectura de Microservicios implementada a través de un Monorepo de NestJS.

## 2. Stack Tecnológico

*   **Backend:** NestJS, TypeScript
*   **Gestión de Paquetes / Desarrollo:** Bun
*   **Runtime de Producción:** Node.js estándar
*   **Base de Datos Relacional:** PostgreSQL
*   **Broker de Mensajes / Caché:** Redis (usando BullMQ para colas)
*   **Infraestructura:** Docker y Docker Compose
*   **Calidad y Testing:** ESLint, Prettier, Husky, Jest (Unit & E2E)
*   **Patrones / Principios:** Microservicios, Clean Architecture (donde aplique), Monorepo, Event-Driven, SOLID.

## 3. Topología de Microservicios

### 3.1 `api-gateway` (HTTP API REST)
*   **Responsabilidad:** Punto de entrada público HTTP. Maneja autenticación IAM (Identity & Access Management), validación JWT, y encolado de trabajos hacia Redis.
*   **Acoplamiento a Base de Datos:** Accede a tablas de usuarios e inserta los estados iniciales de los trabajos (ej., `QUEUED`).
    *   ✅ **Status: COMPLETED** — Prisma 7.x configurado con PostgreSQL. Schema con modelos `User` y `NotificationJob`. Migración inicial aplicada. `PrismaService` y `NotificationJobService` en `libs/common`.
*   **Comportamiento Async:** Responde `HTTP 202 Accepted` tras colocar un mensaje en la cola, indicando que el envío está en progreso (Producer).
    *   ✅ **Status: COMPLETED** — `NotificationsController` retorna `202 Accepted` y encola el trabajo vía `NotificationsProducer`.

### 3.2 `notification-worker` (Microservicio Headless)
*   **Responsabilidad:** Tareas de background y motor de envíos.
*   **Comportamiento:** No expone API HTTP (salvo para métricas de salud). Extrae trabajos de la cola Redis, se comunica con terceros (SMTP, Twilio) manejando reintentos (Backoff) y lógica pesada. Emite eventos derivados con el resultado de la operación (Consumer / Publisher).
    *   ✅ **Worker & Queue:** COMPLETED — `NotificationProcessor` consume de cola `notifications` con deduplicación vía `SETNX`, respeta correlation IDs.
    *   ⚠️ **Adapters (SMTP/Twilio):** PARTIAL — Existen `EmailAdapter` y `SmsAdapter` pero son implementaciones mock (solo log). Falta integración real con proveedores SMTP y Twilio.
    *   ✅ **Event Emission:** COMPLETED — `@nestjs/event-emitter` integrado. `NotificationService` emite `NotificationSentEvent` y `NotificationFailedEvent` vía `EventEmitter2`. Clases de eventos en `libs/common/src/events/`.
    *   ✅ **Health/Metrics:** COMPLETED — `HealthController` (GET /health) y `MetricsController` (GET /metrics) con Prometheus.

### 3.3 Libs (Código Compartido)
*   Módulos de NestJS reutilizables importados por los microservicios, como:
    *   DTOs comunes y Tipos de Eventos (`common`). ✅ COMPLETED — `CreateNotificationDto`, enums (`NotificationChannel`, `NotificationStatus`, `EventType`), interfaces (`NotificationJob`, `Template`, `NotificationPayload`, `NotificationMetadata`), y `validateRequiredEnv`.
    *   Logger personalizado estructurado. ✅ COMPLETED — `LoggerModule` con `nestjs-pino` y extracción de `correlationId` desde headers HTTP.
        *   ✅ NOTA: Ahora ambos microservicios importan `LoggerModule`. El `notification-worker` usa `PinoLogger` con `setContext()` y `assign()` para correlación de logs.
    *   Módulo base de conexión a Redis (BullMQ UI/Setup). ✅ COMPLETED — `RedisClientModule` con `RedisClientService` que provee `createQueue()`, `createWorker()`, `setIfNotExists()`, `get()`, `del()`.

## 4. Estructura de Directorios (Monorepo)

```text
/
├── apps/
│   ├── api-gateway/            
│   │   ├── src/
│   │   │   ├── iam/            # Auth, Guards, JWT
│   │   │   ├── http/           # Controladores REST, Swagger
│   │   │   └── producers/      # Servicios de inserción en Colas de Redis
│   │   └── Dockerfile
│   │
│   ├── notification-worker/    
│   │   ├── src/
│   │   │   ├── core/           # Dominio y Reglas
│   │   │   ├── consumers/      # BullMQ Processors (Listeners de la cola)
│   │   │   └── adapters/       # Integraciones SMTP, Twilio, APNs
│   │   └── Dockerfile
│
├── libs/                       
│   ├── common/                 # DTOs, Enums de eventos comunes
│   ├── redis-client/           # Configuración base de Redis y BullMQ central
│   └── logger/                 # Implementación de Pino para correlación de logs
│
├── docker-compose.yml          # Setup local (Postgres, Redis, Apps)
└── package.json                
```

## 5. Decisiones Arquitectónicas y Governance

1.  **Estrategia de Persistencia (Pragmática / Shared DB):** Ambos microservicios (`api-gateway` y `notification-worker`) compartirán la base de datos PostgreSQL. Aunque esto crea un nivel de acoplamiento de datos, se asume como trade-off para evitar sincronización compleja en este momento del proyecto, facilitando vistas conjuntas del sistema.
    *   ✅ **Status: COMPLETED** — Prisma 7.x integrado. Schema con `User` y `NotificationJob`. Migración inicial aplicada. Servicios compartidos via libs/common.
2.  **Dueño de las Plantillas (Worker Ownership):** El `notification-worker` es el custodio de las plantillas (Templates). El payload que empuja el `api-gateway` a Redis sólo indica un intention (ej. "Usa template #5 con estas variables"). Si no existe o las variables están mal, el Worker asume el error en tiempo de procesamiento.
    *   ✅ **Status: COMPLETED** — `TemplateService` reside en `notification-worker` con templates precargados en memoria. El worker valida existencia y canal en tiempo de procesamiento.
3.  **Idempotencia de Doble Capa:** Se implementa defensa en profundidad.
    *   *Capa 1 (API Idempotency):* El cliente debe enviar un header `Idempotency-Key`. Esto protege contra timeouts, dobles clicks y retries rápidos en red. ✅ COMPLETED — Implementado en `NotificationsController` vía `SETNX`.
    *   *Capa 2 (Worker Deduplication):* El Worker genera un hash y usa `SETNX` de Redis para bloquear envíos duplicados hacia Twilio/SendGrid. Protege contra reconsumos de eventos o mensajes duplicados (At-Least-Once delivery). ✅ COMPLETED — Implementado en `NotificationProcessor` con clave `worker-dedupe:{idempotencyKey}`.

## 6. Patrones y Prácticas Críticas

1.  **Observabilidad Distribuida (Correlation IDs):** Todo request HTTP recibe un `x-correlation-id`. Este identificador viaja encapsulado dentro del mensaje hacia BullMQ/Redis. El `notification-worker` lo extrae para continuar el logeado, garantizando trazabilidad total usando un provider de Logger estructurado (Pino).
    *   ✅ **API Gateway:** COMPLETED — `CorrelationIdMiddleware`, `LoggerModule` con Pino, extracción en `NotificationsController`, propagación en `NotificationJob.metadata.correlationId`.
    *   ✅ **Notification Worker:** COMPLETED — El worker importa `LoggerModule` y usa `PinoLogger` con `setContext()` para contexto de servicio y `assign({ correlationId })` para trazabilidad distribuida.
2.  **Inyección de Dependencias Rigurosa:** Eliminación del anti-patrón "singleton manual" (`getInstance`). Toda dependencia (Redis, Loggers) será un provider registrado en los módulos de NestJS.
    *   ✅ **Status: COMPLETED** — Todo el código usa DI de NestJS. No hay singletons manuales.
3.  **Configuración Estricta:** Validación de variables de entorno al arranque. Si `REDIS_URL` falta, el microservicio crashea inmediatamente (Fail-fast).
    *   ✅ **Status: COMPLETED** — `validateRequiredEnv()` implementado en `libs/common` y usado en ambos `main.ts`.
4.  **Invarianza de Lógica de Negocio:** Separar estrictamente la validación HTTP (DTOs / Presentation) del procesamiento real o las librerías de adaptadores, evitando ensuciar casos de uso core.
    *   ✅ **Status: COMPLETED** — Separación clara: `api-gateway` (controllers/producers) vs `notification-worker` (core/adapters). DTOs de validación en `libs/common`.

## 7. Riesgos y Trade-offs Asumidos
*   **Complejidad Operacional:** Escalar monolito a microservicios implica lidiar con infraestructura local más compleja (Docker Compose requerido con multi-contenedores).
    *   ✅ Docker Compose configurado con 4 servicios (redis, postgres, api-gateway, notification-worker) y perfiles `dev`/`prod`.
    *   ✅ Healthchecks agregados para Redis (`redis-cli ping`) y PostgreSQL (`pg_isready`) con `condition: service_healthy` en dependencias.
*   **Transaccionalidad Distribuida:** Al enviar a base de datos y a Redis a la vez, pueden surgir desincronizaciones si Redis falla. Por alcance del proyecto/portafolio, se abordará mediante "Graceful degradation" o reintentos asíncronos en el gateway sin aplicar inicialmente un patrón Outbox complejo.
    *   ⚠️ **PARCIAL** — Ahora se persiste el job en DB antes de encolar en Redis. Si Redis falla después de escribir en DB, el job queda en estado `queued` sin procesar. Sin reintentos asíncronos aún. BullMQ configurado con 5 reintentos y backoff exponencial.
*   **Acoplamiento de Base de Datos:** Se asume el riesgo arquitectónico temporal del patrón "Shared Database" en favor de simplicidad; los cambios de esquema impactarán a ambos microservicios.
    *   ✅ **Status: ACEPTADO** — Ambos microservicios (`api-gateway` y `notification-worker`) importan `PrismaModule` y comparten el mismo esquema de base de datos.

## 8. Roadmap y Fases de Implementación

1.  **Fase 0 - Arquitectura Base:** Setup del Monorepo en NestJS. Estructuración de la carpeta `libs/` compartida, ESLint preventivo, Prettier, y orquestación con Docker Compose (PostgreSQL y Redis).  
    Status: ✅ **COMPLETED**  
    - ✅ Monorepo NestJS configurado (`nest-cli.json` con `monorepo: true`, 2 apps, 3 libs)  
    - ✅ `libs/common`, `libs/logger`, `libs/redis-client` creados y publicados como paquetes internos (`@app/*`)  
    - ✅ ESLint + Prettier configurados  
    - ✅ Husky con pre-commit hook (`format → lint → test`)  
    - ✅ Docker Compose con PostgreSQL 15 y Redis 7  
    - ✅ Dockerfiles multi-stage para producción (build con Bun, runtime con Node.js)

2.  **Fase 1 - IAM & API Gateway:** Desarrollo del servicio REST. Guardias de seguridad (JWT), loggers con inyección de Correlation ID, Endpoints, Swagger y testing E2E rápido de Auth.  
    Status: ✅ **COMPLETED** — `api-gateway` contiene `IamModule` (mock login), `AuthGuard` JWT, `CorrelationIdMiddleware`, `LoggerModule` (Pino), Swagger, y tests E2E de auth.

3.  **Fase 2 - Message Broker & Worker Base:** Configurar BullMQ. Implementar la conexión Productor (`api-gateway`) a Consumidor (`notification-worker`). Validación de que los mensajes y correlation IDs pasen correctamente de un proceso a otro.  
    Status: ✅ **COMPLETED**  
    - ✅ `libs/redis-client`: `RedisClientService` con `createQueue()`, `createWorker()`, `setIfNotExists()`, `get()`, `del()`  
    - ✅ `apps/api-gateway/src/producers/notifications.producer.ts`: Producer que encola jobs a cola `notifications` con metadata, `jobId` (idempotencyKey), 5 reintentos y backoff exponencial  
    - ✅ `apps/api-gateway/src/http/notifications.controller.ts`: `POST /notifications` con soporte de `x-correlation-id`, `Idempotency-Key` y deduplicación vía `SETNX`  
    - ✅ `apps/notification-worker/src/consumers/notification.processor.ts`: Worker con deduplicación secundaria (`worker-dedupe:*`), concurrencia 5, `lockDuration` 5min  
    - ✅ E2E test de integración: `notifications.e2e-spec.ts` verifica encolado completo  
    - ⚠️ **Pendiente:** Mejorar políticas de retry/backoff configurables por canal, monitoreo de colas con BullMQ Dashboard/UI.

4.  **Fase 3 - Adaptadores y Core:** Lógica principal del `notification-worker`. Adaptabilidad para canales (Email, SMS), límites de tasa (rate-limits por proveedor), fallback y reintentos.  
    Status: 🔧 **IN PROGRESS** — Mayoría del core completado, faltan integraciones reales:  
    - ✅ **NotificationService**: Orquestación completa (validación de template → rate limiting → render → envío → DB → métricas → eventos)  
    - ✅ **TemplateService**: 4 templates precargados en memoria con renderizado `{{variable}}`  
    - ✅ **RateLimiterService**: Rate limiting por canal vía Redis (10 msg/s por canal)  
    - ✅ **AdapterRegistry + Adapter Pattern**: Registro y resolución de canales  
    - ✅ **EmailAdapter & SmsAdapter**: Implementaciones mock (log-only)  
    - ✅ **MetricsService**: Contadores Prometheus (`notifications_sent_total`, `notifications_failed_total`, `notifications_rate_limited_total`)  
    - ✅ **Health & Metrics endpoints**: `GET /health` (con counts de cola), `GET /metrics` (Prometheus)  
    - ✅ **Event Emission**: EventEmitter2 integrado, emite `NotificationSentEvent` / `NotificationFailedEvent`  
    - ✅ **Unit tests**: `notification.service.spec.ts`, `template.service.spec.ts`, `adapter.registry.spec.ts`  
    - ⚠️ **Faltante:** Adaptadores reales SMTP/Twilio/APNs (actualmente son mock)  
    - ⚠️ **Faltante:** Mecanismo de fallback entre proveedores (ej. SMTP primario → secundario)  
    - ❌ **Faltante:** Adapter para Push (`NotificationChannel.PUSH` definido pero no implementado)

5.  **Fase 4 - Finalización:** Observabilidad en reportes finales. Cobertura de tests E2E donde se impacte el HTTP del gateway y se revise que la infraestructura Redis logre procesar el evento end-to-end.  
    Status: 🔧 **IN PROGRESS**  
    - ✅ Prometheus metrics endpoint funcionando  
    - ✅ E2E tests: Auth (`iam.e2e-spec.ts`), Notifications (`notifications.e2e-spec.ts`), Worker health/metrics, Full pipeline (`full-pipeline.e2e-spec.ts`)  
    - ✅ **Worker con Pino logger estructurado** — `LoggerModule` importado, `PinoLogger` con `assign({ correlationId })`  
    - ✅ **Conexión a PostgreSQL** — Prisma 7.x con schema `User` y `NotificationJob`, migración aplicada  
    - ✅ **Persistencia de jobs** — `NotificationJobService` crea job en estado `queued`, worker actualiza a `processing`/`sent`/`failed`  
    - ✅ **Emisión de eventos** — `@nestjs/event-emitter` integrado en ambos microservicios  
    - ✅ **CI/CD pipeline** — GitHub Actions configurado (lint, typecheck, unit tests, e2e tests)  
    - ✅ **Healthchecks Docker** — Redis y PostgreSQL con healthchecks, servicios dependen de `condition: service_healthy`  
    - ❌ **Faltante:** E2E full pipeline end-to-end real (con worker procesando en el mismo test)  
    - ❌ **Faltante:** Adaptadores reales (SMTP, Twilio, etc.)
