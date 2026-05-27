import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { ApiGatewayModule } from "../src/api-gateway.module";

describe("IAM Auth (e2e)", () => {
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

  describe("POST /auth/login", () => {
    it("should successfully authenticate and return a valid JWT", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .expect(200);

      const body: Record<string, unknown> = response.body as Record<
        string,
        unknown
      >;

      expect(body).toHaveProperty("access_token");
      expect(typeof body.access_token).toBe("string");

      const accessToken = body.access_token as string;
      const tokenParts = accessToken.split(".");
      expect(tokenParts).toHaveLength(3);
    });

    it("should include the x-correlation-id in the response header", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .expect(200);

      expect(response.headers).toHaveProperty("x-correlation-id");
      expect(typeof response.headers["x-correlation-id"]).toBe("string");
      expect(response.headers["x-correlation-id"].length).toBeGreaterThan(0);
    });
  });
});
