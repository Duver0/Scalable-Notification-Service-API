# Skill: Event-Driven Design

## Purpose
Establish a consistent pattern for domain events, event publishing, and event handling in this NestJS+CQRS project. Events decouple side effects from the main command flow, enabling extensibility without modifying existing commands.

## Event Flow

```
CommandHandler (success)
  → EventBus.publish(new SomethingHappenedEvent(payload))
    → EventHandler A (async, same process)
    → EventHandler B (async, same process)
    → Bull queue (async, background job)
      → Queue Worker (separate process)
        → External API call / long-running task
```

## Event Types

### 1. Domain Events (in-process, same transaction)
- Published after a command succeeds, before the response is sent
- Handlers run **synchronously within the same request** or **asynchronously via NestJS event bus**
- Used for side effects that must complete before the response (e.g., invalidating a cache)
- MUST NOT fail the original command; wrap in try/catch with logging

```typescript
// domain/events/notification-sent.event.ts
export class NotificationSentEvent {
  constructor(
    public readonly notificationId: string,
    public readonly recipientId: string,
    public readonly channel: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}

// application/events/handlers/notification-sent.handler.ts
@EventHandler(NotificationSentEvent)
export class NotificationSentHandler implements IEventHandler<NotificationSentEvent> {
  constructor(private readonly analyticsService: AnalyticsService) {}
  async handle(event: NotificationSentEvent): Promise<void> {
    await this.analyticsService.track('notification.sent', {
      notificationId: event.notificationId,
      channel: event.channel,
    });
  }
}
```

### 2. Integration Events (async, via message broker)
- Published to a message broker (Redis Pub/Sub, RabbitMQ, Kafka, Bull queue)
- Used for cross-service communication, heavy background processing, or retry-tolerant work
- Handlers run in **separate processes or microservices**

```typescript
// Using Bull queue
@Processor('notifications')
export class NotificationProcessor {
  @Process()
  async handle(job: Job<NotificationSentEvent>) {
    await this.emailService.send(job.data);
  }
}
```

## Event Naming Conventions
- **Past tense**: `NotificationSentEvent`, `UserRegisteredEvent`, `PaymentFailedEvent`
- **Verb + noun**: past tense action + aggregate/subject
- **Namespace when ambiguous**: `Notification.Created`, `User.EmailVerified`

## Publishing Rules
1. **Publish after the aggregate state change is committed** (transaction outbox pattern if critical)
2. **Publish one event type per meaningful state transition** (not one massive event with everything)
3. **Include the aggregate ID and timestamp** in every event for tracing
4. **Do not include sensitive data** (passwords, tokens) in event payloads
5. **Keep event payloads immutable** (readonly properties)

## Anti-Patterns
- Publishing events inline before the command's database transaction commits (event handler reads stale data)
- Putting too much data in the event payload (reference IDs and include a lookup mechanism)
- Event handlers that modify the same aggregate that published the event (creates confusing, circular flows)
- Using events as a substitute for method calls (events are for cross-cutting side effects, not control flow)
- Not handling event handler failures (event handlers should be idempotent and have their own error handling)
- Synchronous event handlers that block the HTTP response for non-critical side effects

## Best Practices
- Implement the **Transactional Outbox** pattern for events that must be reliably delivered: write the event to an `outbox` table in the same DB transaction as the aggregate, then a separate process publishes the outbox events to the broker.
- Make event handlers **idempotent**: processing the same event twice should produce the same result.
- Use **event versioning** when the payload structure changes: `NotificationSentV2Event`
- Correlate events with a `correlationId` that flows from the original HTTP request
- Use Bull or similar for events that require retry/backoff/delay (e.g., sending an email with retry)
- Monitor the event bus: alert on failed event handlers or growing queue backlog
- Document the event catalog in `docs/events.md` so new developers know what events exist and what they trigger
