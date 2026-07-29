import { afterAll, beforeAll } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@localhost:5432/estateos_test?schema=public';
process.env.JWT_SECRET ??= 'estateos-test-secret-that-is-at-least-32-characters-long';
process.env.CLIENT_ORIGIN ??= 'http://localhost:5173';

let disconnectPrisma: (() => Promise<void>) | undefined;

beforeAll(async () => {
  const { prisma } = await import('../src/lib/prisma.js');
  disconnectPrisma = () => prisma.$disconnect();
});

afterAll(async () => {
  await disconnectPrisma?.();
});
