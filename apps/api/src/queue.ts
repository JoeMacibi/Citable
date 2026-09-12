import { Redis } from 'ioredis';
import { Queue } from 'bullmq';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

export const crawlQueue = new Queue('citable-crawl', { connection: redis });
