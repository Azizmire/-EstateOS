import type { NextFunction, Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const consume = vi.hoisted(() => vi.fn());

vi.mock('../src/lib/redis.js', () => ({
  consumeRateLimit: consume,
}));

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

describe('distributed security middleware branches', () => {
  beforeEach(() => {
    consume.mockResolvedValue({ count: 1, resetAt: Date.now() + 60_000 });
  });

  it('uses the distributed rate-limit result', async () => {
    const res = response();
    const next = vi.fn() as NextFunction;
    await rateLimit({ windowMs: 60_000, limit: 2, keyPrefix: 'login' })(
      { ip: '192.0.2.1' } as Request,
      res,
      next,
    );
    expect(next).toHaveBeenCalledWith();
    expect(res.setHeader).toHaveBeenCalledWith('RateLimit-Remaining', '1');
  });

  it('passes distributed store errors to Express', async () => {
    const error = new Error('redis unavailable');
    consume.mockRejectedValue(error);
    const next = vi.fn() as NextFunction;
    await rateLimit({ windowMs: 60_000, limit: 2, keyPrefix: 'login' })(
      { ip: '192.0.2.1' } as Request,
      response(),
      next,
    );
    expect(next).toHaveBeenCalledWith(error);
  });

  it('allows documentation assets in the documentation CSP', () => {
    const res = response();
    securityHeaders({ path: '/api/docs/' } as Request, res, vi.fn());
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({
      'Content-Security-Policy': expect.stringContaining("'unsafe-inline'"),
    }));
  });

  it('generates a request id when the caller does not provide one', () => {
    const req = { get: vi.fn().mockReturnValue(undefined) } as unknown as Request;
    const res = response();
    requestContext(req, res, vi.fn());
    expect(res.locals.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
