import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        customProps: (req) => {
          // When req is undefined (non-HTTP contexts like worker), provide defaults
          if (!req) {
            return { context: "Worker" };
          }
          return {
            context: "HTTP",
            correlationId: req.headers["x-correlation-id"],
          };
        },
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty" }
            : undefined,
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
