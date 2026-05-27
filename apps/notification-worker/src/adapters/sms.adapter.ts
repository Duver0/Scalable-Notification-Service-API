import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannelPort, SendResult } from "../core/channel.interface";

@Injectable()
export class SmsAdapter implements NotificationChannelPort {
  readonly channelName = "sms";
  private readonly logger = new Logger(SmsAdapter.name);

  async send(to: string, _subject: string, body: string): Promise<SendResult> {
    this.logger.log(`[MOCK] Sending SMS to=${to} body=${body}`);
    return await Promise.resolve({
      success: true,
      providerMessageId: `mock-sms-${Date.now()}`,
    });
  }
}
