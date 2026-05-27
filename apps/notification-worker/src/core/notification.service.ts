import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PinoLogger } from "nestjs-pino";
import {
  NotificationJob,
  NotificationJobService,
  EventType,
  NotificationSentEvent,
  NotificationFailedEvent,
} from "@app/common";
import { TemplateService } from "./template.service";
import { RateLimiterService } from "./rate-limiter.service";
import { MetricsService } from "./metrics.service";
import { AdapterRegistry } from "../adapters/adapter.registry";

@Injectable()
export class NotificationService {
  constructor(
    private readonly logger: PinoLogger,
    private readonly templateService: TemplateService,
    private readonly rateLimiter: RateLimiterService,
    private readonly metricsService: MetricsService,
    private readonly adapterRegistry: AdapterRegistry,
    private readonly jobService: NotificationJobService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.logger.setContext(NotificationService.name);
  }

  async process(
    job: NotificationJob,
  ): Promise<{ ok: boolean; channel: string; to: string; templateId: string }> {
    const { payload, metadata } = job;
    const { channel, to, templateId, variables } = payload;
    const dbJobId = metadata?.dbJobId;
    const correlationId = metadata?.correlationId;

    try {
      // Mark as processing
      if (dbJobId) {
        await this.jobService
          .updateJobStatus(dbJobId, "processing")
          .catch(() => {
            this.logger.warn(
              { dbJobId },
              "Failed to update job status to processing",
            );
          });
      }

      const template = this.templateService.findById(templateId);
      if (!template) {
        this.logger.warn({ templateId, channel }, "Template not found");
        this.metricsService.incrementFailed(channel);
        this.emitFailed(
          dbJobId,
          correlationId,
          channel,
          to,
          templateId,
          `Template ${templateId} not found`,
        );
        throw new Error(`Template ${templateId} not found`);
      }

      if (template.channel !== channel) {
        this.logger.warn(
          { templateId, channel, expectedChannel: template.channel },
          "Template channel mismatch",
        );
        this.metricsService.incrementFailed(channel);
        this.emitFailed(
          dbJobId,
          correlationId,
          channel,
          to,
          templateId,
          `Template ${templateId} is not for channel ${channel}`,
        );
        throw new Error(`Template ${templateId} is not for channel ${channel}`);
      }

      if (await this.rateLimiter.isRateLimited(channel)) {
        this.logger.warn({ channel }, "Rate limited");
        this.metricsService.incrementRateLimited(channel);
        this.emitFailed(
          dbJobId,
          correlationId,
          channel,
          to,
          templateId,
          "Rate limited",
        );
        throw new Error(`Rate limited for channel ${channel}`);
      }

      const { subject, body } = this.templateService.render(
        template,
        variables,
      );

      const adapter = this.adapterRegistry.getAdapter(channel);
      const result = await adapter.send(to, subject, body);

      if (!result.success) {
        this.logger.error(
          { channel, to, error: result.error },
          "Failed to send notification",
        );
        this.metricsService.incrementFailed(channel);
        this.emitFailed(
          dbJobId,
          correlationId,
          channel,
          to,
          templateId,
          result.error ?? "Send failed",
        );
        throw new Error(result.error ?? "Send failed");
      }

      // Success path
      this.metricsService.incrementSent(channel);
      if (dbJobId) {
        await this.jobService
          .updateJobStatus(dbJobId, "sent", {
            providerMessageId: result.providerMessageId,
          })
          .catch(() => {});
      }

      this.eventEmitter.emit(
        EventType.NOTIFICATION_SENT,
        new NotificationSentEvent({
          jobId: dbJobId,
          correlationId,
          channel: template.channel,
          to,
          templateId,
          providerMessageId: result.providerMessageId,
        }),
      );

      this.logger.info(
        { channel, to, providerMessageId: result.providerMessageId },
        "Notification sent successfully",
      );
      return { ok: true, channel, to, templateId };
    } catch (error) {
      // If it's not a controlled error, mark as failed
      const isControlled =
        error instanceof Error &&
        (error.message.startsWith("Template") ||
          error.message.startsWith("Rate limited") ||
          error.message.endsWith("not found") ||
          error.message.endsWith("Send failed"));

      if (dbJobId && !isControlled) {
        await this.jobService
          .updateJobStatus(dbJobId, "failed", {
            errorMessage: (error as Error).message,
          })
          .catch(() => {});
      }
      throw error;
    }
  }

  private emitFailed(
    dbJobId: string | undefined,
    correlationId: string | null,
    channel: string,
    to: string,
    templateId: string,
    error: string,
  ) {
    this.eventEmitter.emit(
      EventType.NOTIFICATION_FAILED,
      new NotificationFailedEvent({
        jobId: dbJobId,
        correlationId,
        channel,
        to,
        templateId,
        error,
      }),
    );
  }
}
