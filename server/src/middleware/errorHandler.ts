import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../lib/http.js';
import { isProd } from '../config/env.js';

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details ?? null });
    return;
  }

  // Postgres unique-violation → 409
  if (typeof err === 'object' && err && 'code' in err && (err as any).code === '23505') {
    res.status(409).json({ error: 'Resource already exists', details: null });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({
    error: 'Internal server error',
    details: isProd ? null : (err as Error)?.message ?? String(err),
  });
}
