export function createRateLimiter({ windowMs = 60000, max = 30 } = {}) {
  const hits = new Map();

  function sweep(now) {
    if (hits.size < 5000) return;
    for (const [key, times] of hits) {
      const active = times.filter((t) => now - t < windowMs);
      if (active.length === 0) hits.delete(key);
    }
  }

  return function limit(key) {
    const now = Date.now();
    const bucket = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (bucket.length >= max) {
      hits.set(key, bucket);
      const oldest = bucket[0] || now;
      return { limited: true, retryAfterMs: Math.max(0, windowMs - (now - oldest)) };
    }
    bucket.push(now);
    hits.set(key, bucket);
    sweep(now);
    return { limited: false, retryAfterMs: 0 };
  };
}
