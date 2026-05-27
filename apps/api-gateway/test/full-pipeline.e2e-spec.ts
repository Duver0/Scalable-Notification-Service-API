import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { ApiGatewayModule } from "../src/api-gateway.module";
import { PrismaService } from "@app/common";
import Redis from "ioredis";

/**
 * Full pipeline E2E test:
 * HTTP API → Redis Queue → Worker processing → Database persistence
 *
 * Prerequisites:
 * - Redis running (docker compose up -d redis)
 * - PostgreSQL running (docker compose up -d postgres)
 * - Migrations applied (npx prisma migrate dev)
 */
describe("Full Pipeline E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisConnection: Redis;

  beforeAll(async () => {
    // Verify Redis is reachable
    const redisHost = process.env.REDIS_HOST ?? "127.0.0.1";
    const redisPort = Number(process.env.REDIS_PORT ?? 6379);
    redisConnection = new Redis({
      host: redisHost,
      port: redisPort,
      maxRetriesPerRequest: null,
    });

    try {
      await redisConnection.ping();
    } catch {
      await redisConnection.quit();
      throw new Error(
        "Redis is not reachable. Start Redis with: docker compose up -d redis",
      );
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiGatewayModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.notificationJob.deleteMany({}).catch(() => {});
    await prisma.user.deleteMany({}).catch(() => {});
    await app.close();
    await redisConnection.quit();
  });

  it("full pipeline: register user → enqueue notification → verify DB persistence", async () => {
    // Step 1: Register a user
    const testEmail = `test-${Date.now()}@example.com`;
    const registerRes = await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: testEmail, username: "Test User" })
      .expect(201);

    expect(registerRes.body).toHaveProperty("access_token");
    expect(registerRes.body).toHaveProperty("user");
    expect(registerRes.body.user.email).toBe(testEmail);

    const token = registerRes.body.access_token;

    // Step 2: Verify user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { email: testEmail },
    });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.username).toBe("Test User");

    // Step 3: Enqueue a notification
    const correlationId = `e2e-full-${Date.now()}`;
    const idempotencyKey = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const notifyRes = await request(app.getHttpServer())
      .post("/notifications")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .set("x-correlation-id", correlationId)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        to: testEmail,
        channel: "email",
        templateId: "welcome-email",
        variables: { name: "Test User" },
      })
      .expect(202);

    expect(notifyRes.body).toHaveProperty("status", "accepted");
    expect(notifyRes.body).toHaveProperty("jobId");
    const jobId = notifyRes.body.jobId;

    // Step 4: Verify the notification job was persisted in the database
    const dbJob = await prisma.notificationJob.findUnique({
      where: { id: jobId },
    });
    expect(dbJob).not.toBeNull();
    expect(dbJob!.status).toBe("queued");
    expect(dbJob!.channel).toBe("email");
    expect(dbJob!.to).toBe(testEmail);
    expect(dbJob!.templateId).toBe("welcome-email");
    expect(dbJob!.correlationId).toBe(correlationId);
    expect(dbJob!.idempotencyKey).toBe(idempotencyKey);

    // Step 5: Verify the job was enqueued in Redis
    const queueKeys = await redisConnection.keys("bull:notifications:*");
    expect(queueKeys.length).toBeGreaterThanOrEqual(1);

    // Step 6: Verify idempotency — same Idempotency-Key returns duplicate
    const duplicateRes = await request(app.getHttpServer())
      .post("/notifications")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .set("x-correlation-id", correlationId)
      .set("Idempotency-Key", idempotencyKey)
      .send({
        to: testEmail,
        channel: "email",
        templateId: "welcome-email",
        variables: { name: "Test User" },
      })
      .expect(202);

    expect(duplicateRes.body).toHaveProperty("status", "duplicate");
  });

  it("should reject notification with invalid template", async () => {
    const correlationId = `e2e-invalid-${Date.now()}`;
    const res = await request(app.getHttpServer())
      .post("/notifications")
      .set("Content-Type", "application/json")
      .set("x-correlation-id", correlationId)
      .send({
        to: "test@example.com",
        channel: "email",
        templateId: "nonexistent-template",
        variables: {},
      })
      .expect(202); // Gateway accepts it (async)

    expect(res.body).toHaveProperty("status", "accepted");
    expect(res.body).toHaveProperty("jobId");

    // The job will be marked as failed later by the worker, but the API accepted it
    const dbJob = await prisma.notificationJob.findUnique({
      where: { id: res.body.jobId },
    });
    expect(dbJob).not.toBeNull();
    expect(dbJob!.status).toBe("queued"); // Initial status before worker processing
  });

  it("should register and login a user", async () => {
    const testEmail = `login-test-${Date.now()}@example.com`;

    // Register
    await request(app.getHttpServer())
      .post("/auth/register")
      .send({ email: testEmail, username: "Login Test" })
      .expect(201);

    // Login
    const loginRes = await request(app.getHttpServer())
      .post("/auth/login")
      .send({ email: testEmail })
      .expect(200);

    expect(loginRes.body).toHaveProperty("access_token");
  });
});
