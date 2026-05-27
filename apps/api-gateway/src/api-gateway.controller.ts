import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("root")
@Controller()
export class ApiGatewayController {
  @Get()
  @ApiOperation({ summary: "API info and available endpoints" })
  getInfo() {
    return {
      service: "Scalable Notification Service API",
      version: "1.0.0",
      docs: "/api",
      endpoints: {
        auth: {
          register: {
            method: "POST",
            path: "/auth/register",
            body: { email: "string", username: "string" },
          },
          login: {
            method: "POST",
            path: "/auth/login",
            body: { email: "string" },
          },
        },
        notifications: {
          enqueue: {
            method: "POST",
            path: "/notifications",
            headers: {
              "x-correlation-id": "optional",
              "Idempotency-Key": "optional",
            },
            body: {
              to: "string",
              channel: "email|sms",
              templateId: "string",
              variables: "Record<string,string>",
            },
          },
        },
        health: {
          api: { method: "GET", path: "/" },
          worker: { method: "GET", path: "http://localhost:3001/health" },
          metrics: { method: "GET", path: "http://localhost:3001/metrics" },
        },
      },
    };
  }
}
