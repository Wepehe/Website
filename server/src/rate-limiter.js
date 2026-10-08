export function createRateLimiter({ maximumRequests, windowMs }) {
  const clients = new Map();

  const cleanup = setInterval(() => {
    const now = Date.now();
    clients.forEach((record, key) => {
      if (record.resetAt <= now) clients.delete(key);
    });
  }, windowMs);
  cleanup.unref();

  return (key) => {
    const now = Date.now();
    const existing = clients.get(key);
    const record = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : existing;

    record.count += 1;
    clients.set(key, record);
    return {
      allowed: record.count <= maximumRequests,
      remaining: Math.max(0, maximumRequests - record.count),
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  };
}
