import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { NotificationsProducer } from "../producers/notifications.producer";
import { RedisClientService } from "@app/redis-client";
import {
  CreateNotificationDto,
  NotificationPayload,
  NotificationChannel,
  NotificationMetadata,
  NotificationJobService,
} from "@app/common";
import type { Request } from "express";

@ApiTags("notifications")
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly producer: NotificationsProducer,
    private readonly redisClient: RedisClientService,
    private readonly jobService: NotificationJobService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List notification jobs" })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "channel", required: false })
  @ApiQuery({ name: "correlationId", required: false })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Paginated list of notification jobs",
  })
  async list(
    @Query("status") status?: string,
    @Query("channel") channel?: string,
    @Query("correlationId") correlationId?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.jobService.findAll({
      status,
      channel,
      correlationId,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a notification job by ID" })
  @ApiResponse({ status: 200, description: "Notification job details" })
  @ApiResponse({ status: 404, description: "Job not found" })
  async get(@Param("id") id: string) {
    const job = await this.jobService.findById(id);
    if (!job) {
      return { statusCode: 404, message: "Notification job not found" };
    }
    return job;
  }

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Enqueue a notification" })
  @ApiResponse({
    status: 202,
    description: "Notification accepted for processing",
  })
  async enqueue(@Req() req: Request, @Body() body: CreateNotificationDto) {
    const correlationId = (req.headers["x-correlation-id"] ||
      req.headers["x-correlationid"] ||
      null) as string | null;
    const idempotencyKey = (req.headers["idempotency-key"] || null) as
      | string
      | null;

    const payload: NotificationPayload = {
      to: body.to,
      channel: body.channel as NotificationChannel,
      templateId: body.templateId,
      variables: body.variables,
    };

    const metadata: NotificationMetadata = { correlationId, idempotencyKey };

    if (idempotencyKey) {
      const dedupeKey = `idem:${idempotencyKey}`;
      const set = await this.redisClient.setIfNotExists(
        dedupeKey,
        correlationId ?? "1",
        60 * 60,
      );
      if (!set) {
        // Track duplicate at API level
        await this.jobService.createJob({
          channel: payload.channel,
          to: payload.to,
          templateId: payload.templateId,
          variables: payload.variables,
          correlationId,
          idempotencyKey,
        });
        return { status: "duplicate", correlationId };
      }
    }

    // Persist initial job status in database
    const dbJob = await this.jobService.createJob({
      channel: payload.channel,
      to: payload.to,
      templateId: payload.templateId,
      variables: payload.variables,
      correlationId,
      idempotencyKey,
    });

    await this.producer.enqueueNotification({
      payload,
      metadata: { ...metadata, dbJobId: dbJob.id },
    });
    return { status: "accepted", correlationId, jobId: dbJob.id };
  }
}
