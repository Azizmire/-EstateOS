import { createClient } from 'redis';
import { randomUUID } from 'node:crypto';
import { env } from '../config/env.js';
import { logError } from './logger.js';

export const redis = env.REDIS_URL ? createClient({ url: env.REDIS_URL }) : null;

redis?.on('error', (error) => {
  logError('Redis connection error', error);
});

export async function connectRedis() {
  if (redis && !redis.isOpen) await redis.connect();
}

export async function disconnectRedis() {
  if (redis?.isOpen) await redis.quit();
}

export async function consumeRateLimit(key: string, windowMs: number) {
  if (!redis) return null;
  const count = await redis.incr(key);
  if (count === 1) await redis.pExpire(key, windowMs);
  const ttl = await redis.pTTL(key);
  return { count, resetAt: Date.now() + Math.max(ttl, 0) };
}

export async function acquireJobLock(key: string, ttlMs: number) {
  if (!redis) return 'local';
  const token = randomUUID();
  const acquired = await redis.set(key, token, { NX: true, PX: ttlMs });
  return acquired ? token : null;
}

export async function releaseJobLock(key: string, token: string) {
  if (!redis || token === 'local') return;
  await redis.eval(
    'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
    { keys: [key], arguments: [token] },
  );
}
