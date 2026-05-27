export interface SendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface NotificationChannelPort {
  readonly channelName: string;
  send(to: string, subject: string, body: string): Promise<SendResult>;
}
