import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { IamController } from "./iam.controller";
import { IamService } from "./iam.service";
import { AuthGuard } from "./auth.guard";

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: "super-secret", // For dev only
      signOptions: { expiresIn: "60m" },
    }),
  ],
  controllers: [IamController],
  providers: [IamService, AuthGuard],
  exports: [IamService, AuthGuard],
})
export class IamModule {}
