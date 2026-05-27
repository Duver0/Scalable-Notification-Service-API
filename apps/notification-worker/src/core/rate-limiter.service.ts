import { Injectable } from "@nestjs/common";
import { RedisClientService } from "@app/redis-client";

@Injectable()
export class RateLimiterService {
  constructor(private readonly redisClient: RedisClientService) {}

  async isRateLimited(channel: string): Promise<boolean> {
    const key = `ratelimit:${channel}`;
    const current = await this.redisClient.get(key);
    if (!current) {
      await this.redisClient.setIfNotExists(key, "1", 1);
      return false;
    }
    const count = parseInt(current, 10);
    if (count >= 10) {
      return true;
    }
    const conn = this.redisClient.getConnection();
    await conn.incr(key);
    return false;
  }
}
