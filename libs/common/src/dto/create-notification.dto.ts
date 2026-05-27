export class CreateNotificationDto {
  to!: string;
  channel!: string;
  templateId!: string;
  variables!: Record<string, string>;
}
