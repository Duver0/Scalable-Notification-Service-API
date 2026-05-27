import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { IamService } from "./iam.service";

class RegisterDto {
  email!: string;
  username!: string;
}

class LoginDto {
  email!: string;
}

@ApiTags("auth")
@Controller("auth")
export class IamController {
  constructor(private readonly iamService: IamService) {}

  @Post("register")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Register a new user" })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  @ApiResponse({ status: 409, description: "User already exists" })
  async register(@Body() body: RegisterDto) {
    return await this.iamService.register(body.email, body.username);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login and get JWT token" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: "Returns a JWT token" })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Body() body: LoginDto) {
    return await this.iamService.login(body.email);
  }
}
