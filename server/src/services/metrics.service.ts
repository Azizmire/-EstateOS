import type { NextFunction, Request, Response } from 'express';

type Metric = { requests: number; errors: number; totalDurationMs: number };
const startedAt = new Date();
const metrics = new Map<string, Metric>();

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = performance.now();
  res.on('finish', () => {
    const key = `${req.method} ${req.baseUrl || '/api'}`;
    const current = metrics.get(key) ?? { requests: 0, errors: 0, totalDurationMs: 0 };
    current.requests += 1;
    current.errors += res.statusCode >= 400 ? 1 : 0;
    current.totalDurationMs += performance.now() - start;
    metrics.set(key, current);
  });
  next();
}

export function metricsSnapshot() {
  return {
    startedAt: startedAt.toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    routes: [...metrics.entries()].map(([route, value]) => ({
      route,
      requests: value.requests,
      errors: value.errors,
      averageDurationMs: value.requests
        ? Math.round((value.totalDurationMs / value.requests) * 100) / 100
        : 0,
    })),
  };
}
