import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { NotificationWorkerModule } from "./notification-worker.module";
import { Logger } from "nestjs-pino";
import { validateRequiredEnv } from "@app/common";

async function bootstrap() {
  validateRequiredEnv(["REDIS_HOST"], "notification-worker");

  const app = await NestFactory.create(NotificationWorkerModule);
  app.enableCors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "HEAD"],
  });
  app.useLogger(app.get(Logger));

  await app.listen(process.env.PORT ?? 3001, "0.0.0.0");
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
