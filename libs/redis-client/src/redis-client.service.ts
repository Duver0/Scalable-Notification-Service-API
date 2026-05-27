import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, Job } from "bullmq";
import Redis from "ioredis";

@Injectable()
export class RedisClientService implements OnModuleDestroy {
  private connection: Redis | null = null;
  private workers: Worker[] = [];

  getConnection(): Redis {
    if (!this.connection) {
      const host = process.env.REDIS_HOST ?? "127.0.0.1";
      const port = Number(process.env.REDIS_PORT ?? 6379);
      this.connection = new Redis({ host, port, maxRetriesPerRequest: null });
    }
    return this.connection;
  }

  createQueue(name: string): Queue {
    const conn = this.getConnection();
    return new Queue(name, {
      connection: conn as unknown as import("bullmq").ConnectionOptions,
    });
  }

  createWorker(
    name: string,
    processor: (job: Job) => Promise<unknown>,
    opts = {},
  ): Worker {
    const conn = this.getConnection();
    const worker = new Worker(name, processor, {
      connection: conn as unknown as import("bullmq").ConnectionOptions,
      ...opts,
    });
    this.workers.push(worker);
    return worker;
  }

  async onModuleDestroy() {
    await Promise.all(this.workers.map((w) => w.close()));
    if (this.connection) {
      await this.connection.quit();
    }
  }

  /**
   * Attempt to set a key only if it does not exist (SETNX), with optional TTL in seconds.
   * Returns true if the key was set, false if it already existed.
   */
  async setIfNotExists(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<boolean> {
    const conn = this.getConnection();
    if (ttlSeconds && ttlSeconds > 0) {
      const res = await conn.set(key, value, "EX", ttlSeconds, "NX");
      return res === "OK";
    }
    const res = await conn.setnx(key, value);
    return res === 1;
  }

  async get(key: string): Promise<string | null> {
    const conn = this.getConnection();
    return await conn.get(key);
  }

  async del(key: string): Promise<number> {
    const conn = this.getConnection();
    return await conn.del(key);
  }
}
