# Skill: Redis Singleton & Integration

## Purpose
Establish a single, testable, and configurable Redis client for the entire project. Avoid multiple connection pools, ensure proper lifecycle management, and provide a clean abstraction for caching, pub/sub, and rate limiting.

## Rules

### Singleton Pattern
```typescript
// infrastructure/redis/redis.service.ts
@Injectable()
export class RedisService {
  private client: Redis;

  constructor(config: RedisConfig) {
    this.client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      maxRetriesPerRequest: 3,
    });
  }

  async get(key: string): Promise<string | null> { return this.client.get(key); }
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) await this.client.setex(key, ttl, value);
    else await this.client.set(key, value);
  }
  async del(key: string): Promise<void> { await this.client.del(key); }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
```

### Usage Boundaries
- Cache query results (never cache commands or mutations)
- Pub/Sub for cross-instance event distribution
- Session store for rate limiting token buckets
- Job queue backpressure signals (if using Bull, Redis is already integrated)
- DO NOT use Redis as the primary database or for transactional state

### Configuration
```typescript
// infrastructure/config/redis.config.ts
@IsString() host: string;
@IsInt() @Min(1) @Max(65535) port: number;
@IsOptional() @IsString() password?: string;
```

### Health Check
- Redis health check must be part of the application's readiness probe
- A Redis connection failure must not crash the application (circuit breaker or graceful degradation)

## Anti-Patterns
- Creating a new Redis client in every service that needs caching
- Using Redis without TTL (creates unbounded memory growth)
- Storing large objects (>1MB) in Redis
- Mixing cache keys across features without a namespace prefix
- Ignoring Redis connection errors (silent failures lead to hard-to-debug cache misses)
- Using Redis for complex querying or aggregation

## Best Practices
- Prefix keys by feature: `notifications:user:{id}:list`
- Set TTL on every cache entry (unless there is a specific reason not to)
- Use `SETEX` / `PSETEX` for atomic set+expiry
- Implement a `CacheService` abstraction on top of `RedisService` so consumers don't depend on Redis directly
- For rate limiting, use the `@nestjs/throttler` package with Redis store for distributed rate limiting
- Monitor Redis memory usage and eviction policy; configure `maxmemory-policy allkeys-lru`
- In tests, use `ioredis-mock` or Testcontainers for Redis
