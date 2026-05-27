import { Controller, Get } from "@nestjs/common";
import { NotificationWorkerService } from "./notification-worker.service";

@Controller()
export class NotificationWorkerController {
  constructor(
    private readonly notificationWorkerService: NotificationWorkerService,
  ) {}

  @Get()
  getHello(): string {
    return this.notificationWorkerService.getHello();
  }
}
