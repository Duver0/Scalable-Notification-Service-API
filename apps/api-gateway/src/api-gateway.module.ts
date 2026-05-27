import { Module, MiddlewareConsumer, NestModule } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { ApiGatewayController } from "./api-gateway.controller";
import { LoggerModule } from "@app/logger";
import { CommonModule, PrismaModule } from "@app/common";

import { IamModule } from "./iam/iam.module";
import { CorrelationIdMiddleware } from "./common/middleware/correlation-id.middleware";
import { RedisClientModule } from "@app/redis-client";
import { NotificationsProducer } from "./producers/notifications.producer";
import { NotificationsController } from "./http/notifications.controller";

@Module({
  imports: [
    LoggerModule,
    CommonModule,
    PrismaModule,
    IamModule,
    RedisClientModule,
    EventEmitterModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), "apps", "api-gateway", "public"),
      serveRoot: "/dashboard",
      serveStaticOptions: { index: ["index.html"] },
    }),
  ],
  controllers: [ApiGatewayController, NotificationsController],
  providers: [NotificationsProducer],
})
export class ApiGatewayModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes("*");
  }
}
