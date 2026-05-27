import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { NotificationWorkerModule } from "./../src/notification-worker.module";

describe("NotificationWorker (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [NotificationWorkerModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("/health (GET) - returns health status", () => {
    return request(app.getHttpServer())
      .get("/health")
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty("status", "ok");
        expect(res.body).toHaveProperty("queue");
      });
  });

  it("/metrics (GET) - returns prometheus metrics", () => {
    return request(app.getHttpServer())
      .get("/metrics")
      .expect(200)
      .expect("Content-Type", /text\/plain/);
  });
});
