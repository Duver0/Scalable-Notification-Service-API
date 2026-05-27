import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { RedisClientService } from "@app/redis-client";
import { Queue } from "bullmq";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly redisClient: RedisClientService) {}

  @Get()
  async get() {
    const connection =
      this.redisClient.getConnection() as unknown as import("bullmq").ConnectionOptions;
    const queue = new Queue("notifications", { connection });
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "completed",
      "failed",
    );
    await queue.close();
    return {
      status: "ok",
      queue: counts,
    };
  }
}
