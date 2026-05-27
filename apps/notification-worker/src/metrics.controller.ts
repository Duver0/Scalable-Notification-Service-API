import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import client from "prom-client";

@ApiTags("metrics")
@Controller()
export class MetricsController {
  @Get("metrics")
  @Header("Content-Type", "text/plain; version=0.0.4")
  async metrics(): Promise<string> {
    return await client.register.metrics();
  }
}
