import Redis from 'ioredis';
import { env } from '../config/env';

/**
 * Redis client (Upstash-compatible). Used for rate-limiting counters and a
 * lightweight cache of the AI context payload. If REDIS_URL is not configured
 * the app degrades gracefully to an in-memory fallback so local dev still runs.
 */
let client: Redis | null = null;

if (env.REDIS_URL) {
  client = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    enableReadyCheck: false,
  });
  client.on('error', (err) => {
    console.warn('[redis] connection error (continuing without cache):', err.message);
  });
  client.connect().catch(() => {
    console.warn('[redis] could not connect — falling back to in-memory store');
    client = null;
  });
}

// In-memory fallback with TTL support.
const memory = new Map<string, { value: string; expires: number }>();

export const cache = {
  async get(key: string): Promise<string | null> {
    if (client) {
      try {
        return await client.get(key);
      } catch {
        /* fall through to memory */
      }
    }
    const hit = memory.get(key);
    if (!hit) return null;
    if (hit.expires < Date.now()) {
      memory.delete(key);
      return null;
    }
    return hit.value;
  },

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    if (client) {
      try {
        await client.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {
        /* fall through */
      }
    }
    memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  },

  async incr(key: string, ttlSeconds: number): Promise<number> {
    if (client) {
      try {
        const n = await client.incr(key);
        if (n === 1) await client.expire(key, ttlSeconds);
        return n;
      } catch {
        /* fall through */
      }
    }
    const hit = memory.get(key);
    const now = Date.now();
    if (!hit || hit.expires < now) {
      memory.set(key, { value: '1', expires: now + ttlSeconds * 1000 });
      return 1;
    }
    const next = parseInt(hit.value, 10) + 1;
    hit.value = String(next);
    return next;
  },

  async del(key: string): Promise<void> {
    if (client) {
      try {
        await client.del(key);
        return;
      } catch {
        /* fall through */
      }
    }
    memory.delete(key);
  },
};

export { client as redisClient };
