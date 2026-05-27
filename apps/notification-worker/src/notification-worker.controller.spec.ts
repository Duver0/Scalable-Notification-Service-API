import { Test, TestingModule } from "@nestjs/testing";
import { NotificationWorkerController } from "./notification-worker.controller";
import { NotificationWorkerService } from "./notification-worker.service";

describe("NotificationWorkerController", () => {
  let notificationWorkerController: NotificationWorkerController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [NotificationWorkerController],
      providers: [NotificationWorkerService],
    }).compile();

    notificationWorkerController = app.get<NotificationWorkerController>(
      NotificationWorkerController,
    );
  });

  describe("root", () => {
    it('should return "Hello World!"', () => {
      expect(notificationWorkerController.getHello()).toBe("Hello World!");
    });
  });
});
