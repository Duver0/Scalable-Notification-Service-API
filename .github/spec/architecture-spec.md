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
*   **Comportamiento Async:** Responde `HTTP 202 Accepted` tras colocar un mensaje en la cola, indicando que el envío está en progreso (Producer).

### 3.2 `notification-worker` (Microservicio Headless)
*   **Responsabilidad:** Tareas de background y motor de envíos.
*   **Comportamiento:** No expone API HTTP (salvo para métricas de salud). Extrae trabajos de la cola Redis, se comunica con terceros (SMTP, Twilio) manejando reintentos (Backoff) y lógica pesada. Emite eventos derivados con el resultado de la operación (Consumer / Publisher).

### 3.3 Libs (Código Compartido)
*   Módulos de NestJS reutilizables importados por los microservicios, como:
    *   DTOs comunes y Tipos de Eventos (`common`).
    *   Logger personalizado estructurado.
    *   Módulo base de conexión a Redis (BullMQ UI/Setup).

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
2.  **Dueño de las Plantillas (Worker Ownership):** El `notification-worker` es el custodio de las plantillas (Templates). El payload que empuja el `api-gateway` a Redis sólo indica un intention (ej. "Usa template #5 con estas variables"). Si no existe o las variables están mal, el Worker asume el error en tiempo de procesamiento.
3.  **Idempotencia de Doble Capa:** Se implementa defensa en profundidad.
    *   *Capa 1 (API Idempotency):* El cliente debe enviar un header `Idempotency-Key`. Esto protege contra timeouts, dobles clicks y retries rápidos en red.
    *   *Capa 2 (Worker Deduplication):* El Worker genera un hash y usa `SETNX` de Redis para bloquear envíos duplicados hacia Twilio/SendGrid. Protege contra reconsumos de eventos o mensajes duplicados (At-Least-Once delivery).

## 6. Patrones y Prácticas Críticas

1.  **Observabilidad Distribuida (Correlation IDs):** Todo request HTTP recibe un `x-correlation-id`. Este identificador viaja encapsulado dentro del mensaje hacia BullMQ/Redis. El `notification-worker` lo extrae para continuar el logeado, garantizando trazabilidad total usando un provider de Logger estructurado (Pino).
2.  **Inyección de Dependencias Rigurosa:** Eliminación del anti-patrón "singleton manual" (`getInstance`). Toda dependencia (Redis, Loggers) será un provider registrado en los módulos de NestJS.
3.  **Configuración Estricta:** Validación de variables de entorno al arranque. Si `REDIS_URL` falta, el microservicio crashea inmediatamente (Fail-fast).
4.  **Invarianza de Lógica de Negocio:** Separar estrictamente la validación HTTP (DTOs / Presentation) del procesamiento real o las librerías de adaptadores, evitando ensuciar casos de uso core.

## 7. Riesgos y Trade-offs Asumidos
*   **Complejidad Operacional:** Escalar monolito a microservicios implica lidiar con infraestructura local más compleja (Docker Compose requerido con multi-contenedores).
*   **Transaccionalidad Distribuida:** Al enviar a base de datos y a Redis a la vez, pueden surgir desincronizaciones si Redis falla. Por alcance del proyecto/portafolio, se abordará mediante "Graceful degradation" o reintentos asíncronos en el gateway sin aplicar inicialmente un patrón Outbox complejo.
*   **Acoplamiento de Base de Datos:** Se asume el riesgo arquitectónico temporal del patrón "Shared Database" en favor de simplicidad; los cambios de esquema impactarán a ambos microservicios.

## 8. Roadmap y Fases de Implementación

1.  **Fase 0 - Arquitectura Base:** Setup del Monorepo en NestJS. Estructuración de la carpeta `libs/` compartida, ESLint preventivo, Prettier, y orquestación con Docker Compose (PostgreSQL y Redis).
2.  **Fase 1 - IAM & API Gateway:** Desarrollo del servicio REST. Guardias de seguridad (JWT), loggers con inyección de Correlation ID, Endpoints, Swagger y testing E2E rápido de Auth.
3.  **Fase 2 - Message Broker & Worker Base:** Configurar BullMQ. Implementar la conexión Productor (`api-gateway`) a Consumidor (`notification-worker`). Validación de que los mensajes y correlation IDs pasen correctamente de un proceso a otro.
4.  **Fase 3 - Adaptadores y Core:** Lógica principal del `notification-worker`. Adaptabilidad para canales (Email, SMS), límites de tasa (rate-limits por proveedor), fallback y reintentos.
5.  **Fase 4 - Finalización:** Observabilidad en reportes finales. Cobertura de tests E2E donde se impacte el HTTP del gateway y se revise que la infraestructura Redis logre procesar el evento end-to-end.
