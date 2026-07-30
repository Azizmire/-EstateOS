import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { consumeRateLimit } from '../lib/redis.js';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  const contentSecurityPolicy = req.path?.startsWith('/api/docs')
    ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'"
    : "default-src 'none'; frame-ancestors 'none'";
  res.set({
    'Content-Security-Policy': contentSecurityPolicy,
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-site',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Referrer-Policy': 'no-referrer',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  next();
}

export function requestContext(req: Request, res: Response, next: NextFunction) {
  const requestId = req.get('x-request-id')?.slice(0, 100) || randomUUID();
  res.setHeader('x-request-id', requestId);
  res.locals.requestId = requestId;
  next();
}

export function rateLimit(options: { windowMs: number; limit: number; keyPrefix: string }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${options.keyPrefix}:${req.ip}`;
    let bucket: Bucket;
    try {
      const distributed = await consumeRateLimit(key, options.windowMs);
      if (distributed) {
        bucket = distributed;
      } else {
        const existing = buckets.get(key);
        bucket = !existing || existing.resetAt <= now
          ? { count: 0, resetAt: now + options.windowMs }
          : existing;
        bucket.count += 1;
        buckets.set(key, bucket);
      }
    } catch (error) {
      next(error);
      return;
    }
    res.setHeader('RateLimit-Limit', String(options.limit));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, options.limit - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.limit) {
      res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    if (buckets.size > 10_000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
    }
    next();
  };
}
