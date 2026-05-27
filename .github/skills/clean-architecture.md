# Skill: Clean Architecture

## Purpose
Define and enforce the Clean Architecture layering for this NestJS project. Ensures that domain logic is framework-agnostic, testable in isolation, and protected from infrastructure change.

## Layer Diagram

```
┌─────────────────────────────────────────────────────┐
│                 Presentation (NestJS)                │
│  Controllers, Guards, Interceptors, ExceptionFilters │
│         Depends on: Application (interfaces)         │
├─────────────────────────────────────────────────────┤
│                  Application (Use Cases)             │
│  Commands, Queries, Handlers, DTOs, Port Interfaces │
│         Depends on: Domain (entities, ports)         │
├─────────────────────────────────────────────────────┤
│                    Domain (Core)                     │
│  Entities, Value Objects, Domain Services, Events    │
│         Depends on: Nothing (zero external deps)     │
├─────────────────────────────────────────────────────┤
│                Infrastructure (Adapters)             │
│  Repositories, External API Clients, Redis, Config   │
│         Depends on: Domain + Application (ports)     │
└─────────────────────────────────────────────────────┘
```

## Layer Rules

### Domain Layer (innermost)
- **Zero imports from any framework.** No `@nestjs/*`, no TypeORM decorators, no class-validator.
- Contains entities with business behavior (methods), not anemic data bags.
- Value objects are immutable and self-validating on construction.
- Domain events are plain classes (no library dependency).
- Repository interfaces (ports) are defined here (what the domain needs, not what the database offers).

### Application Layer
- Orchestrates use cases. Imports domain entities/ports but not infrastructure.
- Command/Query/Event handlers live here.
- Contains DTOs that cross the presentation boundary.
- Port interfaces for infrastructure go here or are re-exported from domain.
- **No HTTP-specific code** (no request/response objects, no status codes).

### Infrastructure Layer
- Implements the port interfaces defined in domain/application.
- Contains ORM entities / schema definitions (TypeORM entities, Prisma, raw SQL).
- Contains external service adapters (email provider, SMS gateway, push notification).
- **Depends on the domain and application layers** (never the other way around).

### Presentation Layer
- NestJS controllers, guards, pipes, interceptors, exception filters.
- Converts HTTP requests into application commands/queries.
- Converts application results into HTTP responses.
- **Zero business logic.** Validation is done via DTOs and pipes.

## Dependency Rule
> Source code dependencies can only point inward. Nothing in the inner circle can know about something in an outer circle.

### Concrete Enforcement
- Domain and Application modules should not import from `@nestjs/common` or any database driver
- Domain entities should not have TypeORM or MikroORM decorators (use separate ORM entities in infrastructure)
- Controllers should never import domain entities directly (use DTOs)

## Anti-Patterns
- TypeORM/Mongoose decorators on domain entities (couples domain to the ORM)
- Domain services that import `@Injectable()` or use NestJS DI (domain services are plain classes)
- Business logic in controllers or NestJS providers
- Throwing `HttpException` from application or domain layer
- Application handlers calling infrastructure directly instead of through port interfaces
- Importing infrastructure modules from domain or application modules

## Best Practices
- Keep domain entities small and focused on behavioral correctness (invariants, state transitions)
- Use a separate ORM entity/schema in infrastructure that maps to domain entities
- Write domain unit tests with zero framework imports (pure function tests)
- Use `tsconfig-paths` or barrel exports to enforce layer boundaries at the import level
- Create a `domain/index.ts` that exports only the public API of the domain
- When a new library is introduced, explicitly document which layer it belongs to in the ADR
- Apply the "screaming architecture" principle: the package structure should scream "notification service", not "NestJS project"
