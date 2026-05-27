import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannelPort, SendResult } from "../core/channel.interface";

@Injectable()
export class EmailAdapter implements NotificationChannelPort {
  readonly channelName = "email";
  private readonly logger = new Logger(EmailAdapter.name);

  async send(to: string, subject: string, _body: string): Promise<SendResult> {
    void _body;
    this.logger.log(`[MOCK] Sending email to=${to} subject=${subject}`);
    return await Promise.resolve({
      success: true,
      providerMessageId: `mock-email-${Date.now()}`,
    });
  }
}
