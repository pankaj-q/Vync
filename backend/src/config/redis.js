import { Redis } from 'ioredis';

let redis = null;

if (process.env.REDIS_URL || process.env.REDIS_HOST) {
    redis = new Redis(
        process.env.REDIS_URL || {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD || undefined,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.warn('Redis: max connection retries reached, giving up');
                    return null; // stop retrying
                }
                return Math.min(times * 100, 1000);
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true,
            connectTimeout: 5000,
        },
    );

    redis.on('connect', () => {
        console.log('Redis connected');
    });

    redis.on('error', (err) => {
        console.error('Redis error (non-fatal):', err.message);
    });

    redis.on('close', () => {
        console.log('Redis connection closed');
    });

    // Connect lazily, don't crash on failure
    redis.connect().catch((err) => {
        console.warn('Redis initial connect failed, continuing without Redis:', err.message);
        redis = null;
    });
} else {
    console.log('No Redis config found, running without Redis');
}

export default redis;
