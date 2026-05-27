# Skill: CQRS Pattern

## Purpose
Implement Command Query Responsibility Segregation in a NestJS project using `@nestjs/cqrs`. Commands mutate state; queries return state. Events decouple side effects. This separation keeps each handler focused on a single responsibility.

## Rules

### Command Flow
```
Controller → Command → CommandHandler → Domain Service → Repository → EventBus.publish()
```
- Commands are immutable objects with a `constructor` and readonly properties
- CommandHandlers return `void` or a simple result DTO (never the domain entity directly)
- A command can fail by throwing a domain exception, never by returning an error object

### Query Flow
```
Controller → Query → QueryHandler → Read Model / Query Object → Response DTO
```
- Queries never mutate state
- QueryHandlers return DTOs or plain data structures, never entities with behavior
- Queries can bypass the domain model and use a dedicated read model for performance

### Event Flow
```
CommandHandler → EventBus.publish(Event) → EventHandlers (async, possibly in other modules)
```
- Events are past-tense names: `NotificationSentEvent`, `UserRegisteredEvent`
- EventHandlers are for side effects: sending emails, updating caches, publishing to external systems
- An event handler must not fail the original command. Use `OnEvent` with a separate error-handling strategy.

### Implementation Checklist
1. Define the command/query class in `application/commands/` or `application/queries/`
2. Register the handler in the module's `@Module({ providers: [...] })`
3. Inject `CommandBus` or `QueryBus` into the controller
4. Call `commandBus.execute(new MyCommand(...))` from the controller
5. Write unit tests for the handler in isolation
6. Write integration tests that go controller → bus → handler → repository

## Anti-Patterns
- Commands that return data (they should trigger side effects via events)
- Queries that modify state (use a command instead)
- Putting business logic inside the command or query classes (they are DTOs)
- One handler doing both command processing AND event handling
- Synchronous event handling that blocks the HTTP response (use `@nestjs/bull` or similar for heavy processing)

## Best Practices
- Name commands imperatively: `SendNotificationCommand`, not `NotificationCommand`
- Name queries in the interrogative: `GetNotificationsQuery`, `FindUserByEmailQuery`
- Keep command/query classes in the same file as their handler only if they are very small and co-located
- Use `ICommand`, `IQuery`, and `IEvent` interfaces from `@nestjs/cqrs` for type safety
- Validate command payloads at the controller boundary before execution
