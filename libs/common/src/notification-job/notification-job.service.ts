import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class NotificationJobService {
  private readonly logger = new Logger(NotificationJobService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createJob(data: {
    channel: string;
    to: string;
    templateId: string;
    variables: Record<string, string>;
    correlationId: string | null;
    idempotencyKey: string | null;
    userId?: string;
  }) {
    const job = await this.prisma.notificationJob.create({
      data: {
        status: "queued",
        channel: data.channel,
        to: data.to,
        templateId: data.templateId,
        variables: data.variables,
        correlationId: data.correlationId,
        idempotencyKey: data.idempotencyKey,
        userId: data.userId,
      },
    });
    this.logger.log(`NotificationJob created: ${job.id} (status=queued)`);
    return job;
  }

  async updateJobStatus(
    id: string,
    status: "processing" | "sent" | "failed" | "duplicate",
    extra?: { errorMessage?: string; providerMessageId?: string },
  ) {
    const job = await this.prisma.notificationJob.update({
      where: { id },
      data: {
        status,
        errorMessage: extra?.errorMessage,
        providerMessageId: extra?.providerMessageId,
      },
    });
    this.logger.log(`NotificationJob ${id} -> status=${status}`);
    return job;
  }

  async findByCorrelationId(correlationId: string) {
    return this.prisma.notificationJob.findMany({
      where: { correlationId },
      orderBy: { createdAt: "desc" },
    });
  }

  async findAll(params?: {
    status?: string;
    channel?: string;
    correlationId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {};
    if (params?.status) where.status = params.status;
    if (params?.channel) where.channel = params.channel;
    if (params?.correlationId) where.correlationId = params.correlationId;

    const [items, total] = await Promise.all([
      this.prisma.notificationJob.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: params?.limit ?? 50,
        skip: params?.offset ?? 0,
      }),
      this.prisma.notificationJob.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.notificationJob.findUnique({ where: { id } });
  }
}
