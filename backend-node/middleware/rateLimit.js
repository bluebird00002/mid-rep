const buckets = new Map();

export function rateLimit(maxRequests = 60, windowMs = 60_000, namespace = "general") {
  return (req, res, next) => {
    const now = Date.now();
    const identity = req.user?.userId || req.ip || req.socket?.remoteAddress || "unknown";
    const key = `${namespace}:${identity}`;
    const current = buckets.get(key);
    const bucket = !current || now >= current.resetAt
      ? { count: 0, resetAt: now + windowMs }
      : current;
    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader("RateLimit-Limit", String(maxRequests));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - bucket.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      res.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({
        success: false,
        error: "Too many requests. Please try again later.",
      });
    }

    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) {
        if (now >= value.resetAt) buckets.delete(bucketKey);
      }
    }
    next();
  };
}

export default rateLimit;
