import type { Request, Response, NextFunction } from 'express';
import { cache } from '../lib/redis.js';

/**
 * Sliding-window-ish rate limiter backed by Redis (falls back to memory).
 * 300 requests / 5 minutos (~60/min sostenido), por usuario autenticado (o
 * IP en rutas públicas). Antes era 100/15min (~6.7/min) — se subió para que
 * el polling de Amigos/Hábitos/Tareas/Actividad (cada pocos segundos
 * mientras esas pantallas están abiertas) no choque con el límite.
 */
const WINDOW_SECONDS = 5 * 60;
const MAX_REQUESTS = 300;

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
