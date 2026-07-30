import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  isOpen: false,
  on: vi.fn(),
  connect: vi.fn(),
  quit: vi.fn(),
  incr: vi.fn(),
  pExpire: vi.fn(),
  pTTL: vi.fn(),
  set: vi.fn(),
  eval: vi.fn(),
}));

vi.mock('redis', () => ({ createClient: vi.fn(() => client) }));
vi.mock('../src/config/env.js', () => ({
  env: { REDIS_URL: 'redis://localhost:6379' },
}));

import {
  acquireJobLock,
  connectRedis,
  consumeRateLimit,
  disconnectRedis,
  redis,
  releaseJobLock,
} from '../src/lib/redis.js';

describe('Redis coordination', () => {
  beforeEach(() => {
    client.isOpen = false;
    client.connect.mockResolvedValue(undefined);
    client.quit.mockResolvedValue(undefined);
    client.incr.mockResolvedValue(1);
    client.pExpire.mockResolvedValue(true);
    client.pTTL.mockResolvedValue(500);
    client.set.mockResolvedValue('OK');
    client.eval.mockResolvedValue(1);
  });

  it('connects and disconnects only when needed', async () => {
    await connectRedis();
    expect(client.connect).toHaveBeenCalled();
    client.isOpen = true;
    await connectRedis();
    await disconnectRedis();
    expect(client.quit).toHaveBeenCalled();
    expect(redis).toBe(client);
  });

  it('increments rate limits, initializes expiry, and reports reset time', async () => {
    const result = await consumeRateLimit('limit:user', 1_000);
    expect(client.pExpire).toHaveBeenCalledWith('limit:user', 1_000);
    expect(result?.count).toBe(1);
    expect(result!.resetAt).toBeGreaterThan(Date.now());

    client.incr.mockResolvedValue(2);
    client.pTTL.mockResolvedValue(-1);
    await consumeRateLimit('limit:user', 1_000);
    expect(client.pExpire).toHaveBeenCalledTimes(1);
  });

  it('acquires, rejects, and releases distributed locks atomically', async () => {
    await expect(acquireJobLock('job', 5_000)).resolves.toEqual(expect.any(String));
    client.set.mockResolvedValue(null);
    await expect(acquireJobLock('job', 5_000)).resolves.toBeNull();
    await releaseJobLock('job', 'token');
    expect(client.eval).toHaveBeenCalledWith(
      expect.stringContaining('redis.call'),
      { keys: ['job'], arguments: ['token'] },
    );
  });
});
