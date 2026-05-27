import { Injectable } from "@nestjs/common";
import { NotificationChannel } from "@app/common";
import { NotificationChannelPort } from "../core/channel.interface";
import { EmailAdapter } from "./email.adapter";
import { SmsAdapter } from "./sms.adapter";
import { PushAdapter } from "./push.adapter";

@Injectable()
export class AdapterRegistry {
  private readonly adapters: Map<string, NotificationChannelPort> = new Map();

  constructor(
    emailAdapter: EmailAdapter,
    smsAdapter: SmsAdapter,
    pushAdapter: PushAdapter,
  ) {
    this.adapters.set(NotificationChannel.EMAIL, emailAdapter);
    this.adapters.set(NotificationChannel.SMS, smsAdapter);
    this.adapters.set(NotificationChannel.PUSH, pushAdapter);
  }

  getAdapter(channel: string): NotificationChannelPort {
    const adapter = this.adapters.get(channel);
    if (!adapter) {
      throw new Error(`No adapter found for channel: ${channel}`);
    }
    return adapter;
  }
}
