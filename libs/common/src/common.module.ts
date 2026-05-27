import { Global, Module } from "@nestjs/common";
import { NotificationJobService } from "./notification-job/notification-job.service";

@Global()
@Module({
  providers: [NotificationJobService],
  exports: [NotificationJobService],
})
export class CommonModule {}
