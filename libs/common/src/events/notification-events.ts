import { EventType, NotificationChannel } from "../enums";

export class NotificationSentEvent {
  constructor(
    public readonly payload: {
      jobId?: string;
      correlationId: string | null;
      channel: NotificationChannel;
      to: string;
      templateId: string;
      providerMessageId?: string;
    },
  ) {}
}

export class NotificationFailedEvent {
  constructor(
    public readonly payload: {
      jobId?: string;
      correlationId: string | null;
      channel: string;
      to: string;
      templateId: string;
      error: string;
    },
  ) {}
}

export class NotificationEnqueuedEvent {
  constructor(
    public readonly payload: {
      jobId?: string;
      correlationId: string | null;
      channel: string;
      to: string;
      templateId: string;
    },
  ) {}
}

// Map event types to event classes for type safety
export const EventMap = {
  [EventType.NOTIFICATION_ENQUEUED]: NotificationEnqueuedEvent,
  [EventType.NOTIFICATION_SENT]: NotificationSentEvent,
  [EventType.NOTIFICATION_FAILED]: NotificationFailedEvent,
} as const;
