import type { Request, Response, NextFunction } from 'express';
import { cache } from '../lib/redis.js';

/**
 * Sliding-window-ish rate limiter backed by Redis (falls back to memory).
 * 100 requests / 15 minutes, keyed per authenticated user (or IP for public routes).
 */
const WINDOW_SECONDS = 15 * 60;
const MAX_REQUESTS = 100;

export function rateLimiter(max = MAX_REQUESTS, windowSeconds = WINDOW_SECONDS) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const identity = req.user?.id ?? req.ip ?? 'anonymous';
      const key = `ratelimit:${identity}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
      const count = await cache.incr(key, windowSeconds);

      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - count)));

      if (count > max) {
        res.status(429).json({
          error: 'Too many requests',
          details: `Limit of ${max} requests per ${windowSeconds / 60} minutes exceeded.`,
        });
        return;
      }
      next();
    } catch {
      // Never block traffic on limiter failure.
      next();
    }
  };
}
