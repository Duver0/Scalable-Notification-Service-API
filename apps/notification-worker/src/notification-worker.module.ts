import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { NotificationWorkerController } from "./notification-worker.controller";
import { NotificationWorkerService } from "./notification-worker.service";
import { LoggerModule } from "@app/logger";
import { CommonModule, PrismaModule } from "@app/common";
import { RedisClientModule } from "@app/redis-client";
import { NotificationProcessor } from "./consumers/notification.processor";
import { HealthController } from "./health.controller";
import { MetricsController } from "./metrics.controller";
import { TemplateService } from "./core/template.service";
import { RateLimiterService } from "./core/rate-limiter.service";
import { MetricsService } from "./core/metrics.service";
import { NotificationService } from "./core/notification.service";
import {
  AdapterRegistry,
  EmailAdapter,
  SmsAdapter,
  PushAdapter,
} from "./adapters";

@Module({
  imports: [
    LoggerModule,
    CommonModule,
    PrismaModule,
    RedisClientModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    NotificationWorkerController,
    HealthController,
    MetricsController,
  ],
  providers: [
    NotificationWorkerService,
    NotificationProcessor,
    TemplateService,
    RateLimiterService,
    MetricsService,
    NotificationService,
    AdapterRegistry,
    EmailAdapter,
    SmsAdapter,
    PushAdapter,
  ],
})
export class NotificationWorkerModule {}
