import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationService } from "./notification.service";
import { TemplateService } from "./template.service";
import { RateLimiterService } from "./rate-limiter.service";
import { MetricsService } from "./metrics.service";
import { AdapterRegistry } from "../adapters/adapter.registry";
import { EmailAdapter } from "../adapters/email.adapter";
import { SmsAdapter } from "../adapters/sms.adapter";
import { PushAdapter } from "../adapters/push.adapter";
import { RedisClientService } from "@app/redis-client";
import { NotificationChannel, NotificationJobService } from "@app/common";
import { PinoLogger } from "nestjs-pino";

describe("NotificationService", () => {
  let service: NotificationService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        TemplateService,
        RateLimiterService,
        MetricsService,
        AdapterRegistry,
        EmailAdapter,
        SmsAdapter,
        PushAdapter,
        {
          provide: RedisClientService,
          useValue: {
            get: jest.fn().mockResolvedValue(null),
            setIfNotExists: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: NotificationJobService,
          useValue: {
            createJob: jest.fn().mockResolvedValue({ id: "mock-job-id" }),
            updateJobStatus: jest.fn().mockResolvedValue({}),
          },
        },
        {
          provide: PinoLogger,
          useValue: {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            setContext: jest.fn(),
            assign: jest.fn(),
            trace: jest.fn(),
            debug: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    module.get<MetricsService>(MetricsService).onModuleInit();
  });

  it("should process a valid email notification", async () => {
    const result = await service.process({
      payload: {
        to: "test@example.com",
        channel: NotificationChannel.EMAIL,
        templateId: "welcome-email",
        variables: { name: "John" },
      },
      metadata: { correlationId: "test", idempotencyKey: null },
    });
    expect(result.ok).toBe(true);
    expect(result.channel).toBe("email");
  });

  it("should throw for unknown template", async () => {
    await expect(
      service.process({
        payload: {
          to: "test@example.com",
          channel: NotificationChannel.EMAIL,
          templateId: "unknown",
          variables: {},
        },
        metadata: { correlationId: "test", idempotencyKey: null },
      }),
    ).rejects.toThrow("Template unknown not found");
  });

  it("should process a valid push notification", async () => {
    const result = await service.process({
      payload: {
        to: "device-token-123",
        channel: NotificationChannel.PUSH,
        templateId: "welcome-push",
        variables: { name: "Jane" },
      },
      metadata: { correlationId: "push-test", idempotencyKey: null },
    });
    expect(result.ok).toBe(true);
    expect(result.channel).toBe("push");
  });
});
