import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@app/common";

@Injectable()
export class IamService {
  private readonly logger = new Logger(IamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(email: string, username: string) {
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException("User already exists");
    }

    const user = await this.prisma.user.create({
      data: { email, username },
    });

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

    this.logger.log(`User registered: ${email}`);
    return {
      user: { id: user.id, email: user.email, username: user.username },
      access_token: token,
    };
  }

  async login(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

    return { access_token: token };
  }
}
