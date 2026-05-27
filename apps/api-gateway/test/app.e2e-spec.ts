import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { ApiGatewayModule } from "./../src/api-gateway.module";

describe("ApiGatewayController (e2e)", () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiGatewayModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it("/ (GET) - returns API info", () => {
    return request(app.getHttpServer())
      .get("/")
      .expect(200)
      .expect((res: request.Response) => {
        const body = res.body as Record<string, unknown>;
        expect(body).toHaveProperty("service");
        expect(body).toHaveProperty("endpoints");
        const endpoints = body.endpoints as Record<string, unknown>;
        expect(endpoints).toHaveProperty("auth");
        expect(endpoints).toHaveProperty("notifications");
      });
  });
});
