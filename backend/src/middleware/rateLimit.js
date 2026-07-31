import redis from '../config/redis.js';

const rateLimit = (windowMs = 60000, maxRequests = 30) => {
    return async (req, res, next) => {
        try {
            const key = `ratelimit:${req.ip}`;
            const current = await redis.incr(key);
            if (current === 1) {
                await redis.pexpire(key, windowMs);
            }
            if (current > maxRequests) {
                return res.status(429).json({ message: "Too many requests, please try again later" });
            }
            next();
        } catch (err) {
            next();
        }
    };
};

export const trackOnlineStatus = async (userId, status) => {
    try {
        if (status === 'online') {
            await redis.set(`online:${userId}`, '1', 'EX', 300);
        } else {
            await redis.del(`online:${userId}`);
        }
    } catch (err) {
        console.error("Redis online status error:", err);
    }
};

export const isUserOnline = async (userId) => {
    try {
        const result = await redis.get(`online:${userId}`);
        return result === '1';
    } catch (err) {
        return false;
    }
};

export default rateLimit;
