import { NotificationChannel } from "../enums";

export interface NotificationMetadata {
  correlationId: string | null;
  idempotencyKey: string | null;
  dbJobId?: string;
}

export interface NotificationPayload {
  to: string;
  channel: NotificationChannel;
  templateId: string;
  variables: Record<string, string>;
}

export interface NotificationJob {
  payload: NotificationPayload;
  metadata: NotificationMetadata;
}
