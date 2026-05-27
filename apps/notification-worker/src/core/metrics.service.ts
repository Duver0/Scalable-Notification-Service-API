import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import client from "prom-client";

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);
  private notificationsSentTotal!: client.Counter<string>;
  private notificationsFailedTotal!: client.Counter<string>;
  private notificationsRateLimitedTotal!: client.Counter<string>;

  onModuleInit() {
    try {
      client.collectDefaultMetrics();
    } catch {
      this.logger.warn("Default metrics already registered, skipping");
    }

    this.notificationsSentTotal = new client.Counter({
      name: "notifications_sent_total",
      help: "Total number of notifications sent",
      labelNames: ["channel"],
    });

    this.notificationsFailedTotal = new client.Counter({
      name: "notifications_failed_total",
      help: "Total number of notification failures",
      labelNames: ["channel"],
    });

    this.notificationsRateLimitedTotal = new client.Counter({
      name: "notifications_rate_limited_total",
      help: "Total number of rate-limited notifications",
      labelNames: ["channel"],
    });
  }

  incrementSent(channel: string): void {
    this.notificationsSentTotal.labels(channel).inc();
  }

  incrementFailed(channel: string): void {
    this.notificationsFailedTotal.labels(channel).inc();
  }

  incrementRateLimited(channel: string): void {
    this.notificationsRateLimitedTotal.labels(channel).inc();
  }
}
