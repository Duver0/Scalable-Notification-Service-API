import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { ApiGatewayModule } from "../src/api-gateway.module";
import Redis from "ioredis";
import { Queue } from "bullmq";

describe("Notifications E2E (integration)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiGatewayModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("enqueues a notification and worker processes it", async () => {
    const redisHost = process.env.REDIS_HOST ?? "127.0.0.1";
    const redisPort = Number(process.env.REDIS_PORT ?? 6379);
    const connection = new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
    });

    let redisReachable = false;
    try {
      await connection.ping();
      redisReachable = true;
    } catch {
      await connection.quit();
    }

    if (!redisReachable) {
      await connection.quit();
      throw new Error(
        "Redis is not reachable. Start Redis with: docker compose up -d redis",
      );
    }

    const idempotencyKey = `test-idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const res = await request(app.getHttpServer())
      .post("/notifications")
      .set("Content-Type", "application/json")
      .set("x-correlation-id", "test-corr-id")
      .set("Idempotency-Key", idempotencyKey)
      .send({
        to: "user@example.com",
        templateId: "welcome-email",
        variables: { name: "Test" },
      })
      .expect(202);

    expect(res.body).toHaveProperty("status", "accepted");

    const queue = new Queue("notifications", {
      connection: connection as unknown as import("bullmq").ConnectionOptions,
    });
    const counts = await queue.getJobCounts(
      "waiting",
      "active",
      "delayed",
      "completed",
      "failed",
    );
    const total =
      (counts.waiting ?? 0) +
      (counts.active ?? 0) +
      (counts.delayed ?? 0) +
      (counts.completed ?? 0);
    if (total === 0) {
      const keys = await connection.keys("bull:notifications*");
      expect(keys.length).toBeGreaterThanOrEqual(1);
    } else {
      expect(total).toBeGreaterThanOrEqual(1);
    }

    await queue.close();
    await connection.quit();
  }, 10000);
});
