import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { RedisClientService } from "@app/redis-client";
import { Job } from "bullmq";
import { NotificationJob } from "@app/common";
import { NotificationService } from "../core/notification.service";

@Injectable()
export class NotificationProcessor implements OnModuleInit, OnModuleDestroy {
  private workerRef: any;

  constructor(
    private readonly redisClient: RedisClientService,
    private readonly notificationService: NotificationService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(NotificationProcessor.name);
  }

  onModuleInit() {
    this.workerRef = this.redisClient.createWorker(
      "notifications",
      async (job: Job) => {
        const data = job.data as NotificationJob;
        const { metadata } = data;
        const correlationId = metadata?.correlationId;

        // Assign correlationId to all subsequent log entries from this logger instance
        if (correlationId) {
          this.logger.assign({ correlationId });
        }

        this.logger.info(
          { jobId: job.id, jobName: job.name },
          "Processing job",
        );

        const idempotencyKey = metadata?.idempotencyKey;
        if (idempotencyKey) {
          const workerDedupeKey = `worker-dedupe:${idempotencyKey}`;
          const locked = await this.redisClient.setIfNotExists(
            workerDedupeKey,
            String(job.id),
            24 * 3600,
          );
          if (!locked) {
            this.logger.warn({ idempotencyKey }, "Skipping duplicate job");
            return { skipped: true, reason: "duplicate" };
          }
        }

        await this.notificationService.process(data);
        return {
          ok: true,
          processedAt: new Date().toISOString(),
          correlationId,
        };
      },
      {
        concurrency: 5,
        autorun: true,
        lockDuration: 300000,
      },
    );
  }

  async onModuleDestroy() {
    if (this.workerRef) {
      await (this.workerRef as { close: () => Promise<void> }).close();
    }
  }
}
