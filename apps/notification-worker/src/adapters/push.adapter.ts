import { Injectable, Logger } from "@nestjs/common";
import { NotificationChannelPort, SendResult } from "../core/channel.interface";

@Injectable()
export class PushAdapter implements NotificationChannelPort {
  readonly channelName = "push";
  private readonly logger = new Logger(PushAdapter.name);

  async send(to: string, subject: string, body: string): Promise<SendResult> {
    this.logger.log(
      `[MOCK] Sending push notification device=${to} title=${subject} body=${body}`,
    );
    return await Promise.resolve({
      success: true,
      providerMessageId: `mock-push-${Date.now()}`,
    });
  }
}
