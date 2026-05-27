import { NotificationChannel } from "../enums";

export interface Template {
  id: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  variables: string[];
}
