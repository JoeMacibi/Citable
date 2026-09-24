import { Redis } from 'ioredis';
import { Queue } from 'bullmq';
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
export const redis = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    retryStrategy: (times) => {
        // Retry with backoff up to 5 times, then back off to every 10 seconds
        if (times > 5)
            return 10000;
        return Math.min(times * 500, 3000);
    },
});
let isRedisConnected = false;
redis.on('connect', () => {
    isRedisConnected = true;
    console.log('[Redis] Connected successfully.');
});
redis.on('error', (err) => {
    isRedisConnected = false;
    // Log once or on state change without crashing process
    if (redis._lastErrorLogged !== err.message) {
        console.warn('[Redis Warning] Redis connection issue:', err.message);
        redis._lastErrorLogged = err.message;
    }
});
export function isRedisAvailable() {
    return isRedisConnected;
}
export const crawlQueue = new Queue('citable-crawl', {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 100,
        removeOnFail: 200,
    },
});
