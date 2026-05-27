import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { ApiGatewayModule } from "./api-gateway.module";
import { Logger } from "nestjs-pino";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { validateRequiredEnv } from "@app/common";

async function bootstrap() {
  validateRequiredEnv(["REDIS_HOST", "POSTGRES_HOST"], "api-gateway");

  const app = await NestFactory.create(ApiGatewayModule);

  app.useLogger(app.get(Logger));

  const config = new DocumentBuilder()
    .setTitle("API Gateway")
    .setDescription("The API Gateway for the Notification service")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, documentFactory);

  await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
