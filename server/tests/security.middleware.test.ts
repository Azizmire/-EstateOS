import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { rateLimit, requestContext, securityHeaders } from '../src/middleware/security.js';

function response() {
  return {
    locals: {},
    set: vi.fn(),
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

describe('security middleware', () => {
  it('adds defensive response headers', () => {
    const res = response();
    const next = vi.fn() as NextFunction;
    securityHeaders({} as Request, res, next);
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    }));
    expect(next).toHaveBeenCalledOnce();
  });

  it('preserves a caller request id', () => {
    const req = { get: vi.fn().mockReturnValue('trace-123') } as unknown as Request;
    const res = response();
    const next = vi.fn() as NextFunction;
    requestContext(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'trace-123');
    expect(res.locals.requestId).toBe('trace-123');
  });

  it('rejects requests after the configured limit', async () => {
    const req = { ip: '192.0.2.44' } as Request;
    const res = response();
    const next = vi.fn() as NextFunction;
    const middleware = rateLimit({ windowMs: 60_000, limit: 2, keyPrefix: 'test-limit' });
    await middleware(req, res, next);
    await middleware(req, res, next);
    await middleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenLastCalledWith(429);
  });
});
