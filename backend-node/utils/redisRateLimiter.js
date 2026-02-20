// Optional Redis-backed rate limiter helper (requires `ioredis`)
import Redis from 'ioredis';

export function createRedisClient(url) {
  return new Redis(url);
}

export function redisRateLimit(redisClient, keyPrefix = 'rate', max = 100, windowSec = 60) {
  return async (req, res, next) => {
    try {
      const key = `${keyPrefix}:${req.ip || req.connection.remoteAddress || 'unknown'}`;
      const now = Math.floor(Date.now() / 1000);
      const ttl = windowSec;
      const resCount = await redisClient.multi().incr(key).expire(key, ttl).exec();
      // resCount is array; result of incr is in first element
      const count = resCount && resCount[0] && resCount[0][1] ? resCount[0][1] : 0;
      if (count > max) {
        return res.status(429).json({ success: false, error: 'Too many requests' });
      }
    } catch (err) {
      // on redis error, allow through (fail-open) but log
      console.warn('Redis rate limiter error', err.message || err);
    }
    next();
  };
}
