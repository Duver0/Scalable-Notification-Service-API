import { Injectable, Logger } from "@nestjs/common";
import { RedisClientService } from "@app/redis-client";
import { NotificationJob } from "@app/common";

@Injectable()
export class NotificationsProducer {
  private readonly logger = new Logger(NotificationsProducer.name);

  constructor(private readonly redisClient: RedisClientService) {}

  async enqueueNotification(jobData: NotificationJob) {
    const queue = this.redisClient.createQueue("notifications");
    try {
      const jobId = jobData.metadata.idempotencyKey ?? undefined;
      await queue.add("send-notification", jobData, {
        jobId,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 5,
        backoff: { type: "exponential", delay: 1000 },
      });
      this.logger.log(
        `Enqueued notification job (correlationId=${jobData.metadata.correlationId} jobId=${jobId})`,
      );
    } finally {
      await queue.close();
    }
  }
}
