# Skill: NestJS Module Design

## Purpose
Define a consistent, predictable structure for all NestJS modules in this project. Ensures every module is cohesive, loosely coupled, and follows the same conventions so developers can navigate any module without guesswork.

## Rules

### Module Structure
```
📂 modules/<module-name>/
├── application/
│   ├── commands/
│   │   └── <action>.command.ts
│   ├── handlers/
│   │   ├── <action>.handler.ts
│   │   └── <action>.handler.spec.ts
│   ├── queries/
│   │   └── <query>.query.ts
│   ├── query-handlers/
│   │   ├── <query>.handler.ts
│   │   └── <query>.handler.spec.ts
│   ├── interfaces/
│   │   └── <port>.ts
│   ├── dto/
│   │   ├── <action>.request.dto.ts
│   │   └── <action>.response.dto.ts
│   └── events/
│       ├── <event>.event.ts
│       └── handlers/
│           └── <event>.handler.ts
├── domain/
│   ├── entities/
│   │   └── <entity>.ts
│   ├── value-objects/
│   │   └── <vo>.ts
│   └── services/
│       └── <domain-service>.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── <entity>.repository.ts
│   │   └── <entity>.repository.spec.ts
│   ├── adapters/
│   │   └── <external-service>.adapter.ts
│   └── config/
│       └── <module>.config.ts
├── presentation/
│   ├── <module>.controller.ts
│   ├── <module>.controller.spec.ts
│   └── <module>.module.ts
└── index.ts (barrel exports)
```

### Module Design Principles
1. **One responsibility per module**: a module should encapsulate one bounded context or aggregate.
2. **Explicit exports**: only export what other modules need. Keep internal implementation private.
3. **Module references by type, not by path**: use `@Module({ imports: [...] })`, never import another module's internal files directly.
4. **Dynamic modules for config**: when a module needs configuration, use `registerAsync()` pattern, not a global config.
5. **Shared modules are last resort**: question whether a shared module is necessary before creating one. Prefer composition over shared helpers.

## Anti-Patterns
- A module that imports half the project's modules (too coupled)
- A module that has no controller, no service, and no repository — it probably shouldn't exist
- Circular module imports (NestJS will warn, but it's a design smell)
- Putting everything in a single `common` or `shared` module
- Accessing DI tokens from another module's internal providers

## Best Practices
- Register entities, repositories, and services as providers; export only the service or port interface
- Use `ModuleRef` to access optional providers instead of making them mandatory imports
- Keep `@Global()` modules to an absolute minimum (ideally zero)
- Unit test modules with `Test.createTestingModule()` using the same providers the module exports
- Name modules after their domain concept, not their technical layer (e.g., `NotificationsModule`, not `ServiceModule`)
