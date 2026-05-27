import { Injectable } from "@nestjs/common";

@Injectable()
export class NotificationWorkerService {
  getHello(): string {
    return "Hello World!";
  }
}
