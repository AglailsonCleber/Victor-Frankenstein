const buckets = new Map();

export function checkRateLimit(key, cooldownMs) {
    const now = Date.now();
    const last = buckets.get(key) ?? 0;
    const elapsed = now - last;

    if (elapsed < cooldownMs) {
        return {
            ok: false,
            retryAfterSec: Math.ceil((cooldownMs - elapsed) / 1000),
        };
    }

    buckets.set(key, now);
    return { ok: true };
}

export function pruneRateLimiters(maxAgeMs = 3600000) {
    const now = Date.now();
    for (const [key, timestamp] of buckets.entries()) {
        if (now - timestamp > maxAgeMs) {
            buckets.delete(key);
        }
    }
}

setInterval(() => pruneRateLimiters(), 15 * 60 * 1000).unref?.();
