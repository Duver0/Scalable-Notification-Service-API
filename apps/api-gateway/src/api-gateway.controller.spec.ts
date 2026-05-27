import { Test, TestingModule } from "@nestjs/testing";
import { ApiGatewayController } from "./api-gateway.controller";

describe("ApiGatewayController", () => {
  let apiGatewayController: ApiGatewayController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ApiGatewayController],
      providers: [],
    }).compile();

    apiGatewayController = app.get<ApiGatewayController>(ApiGatewayController);
  });

  describe("root", () => {
    it("should return API info", () => {
      const result = apiGatewayController.getInfo();
      expect(result).toHaveProperty("service");
      expect(result).toHaveProperty("endpoints");
    });
  });
});
