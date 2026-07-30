import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../src/middleware/error.js';

const database = vi.hoisted(() => ({
  userCount: vi.fn(),
  userCreate: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  sessionCreate: vi.fn(),
  sessionFindUnique: vi.fn(),
  sessionUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

const auth = vi.hoisted(() => ({
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock('../src/lib/auth.js', () => ({
  createRefreshToken: vi.fn(() => 'r'.repeat(64)),
  hashPassword: auth.hashPassword,
  hashRefreshToken: vi.fn((token: string) => `hash:${token}`),
  signToken: vi.fn(({ id, role }) => `access:${id}:${role}`),
  verifyPassword: auth.verifyPassword,
}));

vi.mock('../src/middleware/auth.js', () => ({
  requireAuth: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 'admin-1', role: 'ADMIN' };
    next();
  },
  requireRole: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    user: {
      count: database.userCount,
      create: database.userCreate,
      findUnique: database.userFindUnique,
      update: database.userUpdate,
    },
    refreshSession: {
      create: database.sessionCreate,
      findUnique: database.sessionFindUnique,
      updateMany: database.sessionUpdateMany,
    },
    $transaction: database.transaction,
    $disconnect: vi.fn(),
  },
}));

import authRoutes from '../src/routes/auth.js';

const user = {
  id: 'admin-1',
  name: 'Estate Admin',
  email: 'admin@estate.test',
  role: 'ADMIN',
  passwordHash: 'stored-hash',
  createdAt: new Date('2026-07-29T00:00:00.000Z'),
  updatedAt: new Date('2026-07-29T00:00:00.000Z'),
};

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/auth', authRoutes);
  instance.use(errorHandler);
  return instance;
}

describe('authentication routes', () => {
  beforeEach(() => {
    database.userCount.mockResolvedValue(0);
    database.userCreate.mockResolvedValue(user);
    database.userFindUnique.mockResolvedValue(user);
    database.userUpdate.mockResolvedValue(user);
    database.sessionCreate.mockResolvedValue({ id: 'session-1' });
    database.sessionFindUnique.mockResolvedValue({
      id: 'session-1',
      userId: user.id,
      user,
      revokedAt: null,
      rotatedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
    });
    database.sessionUpdateMany.mockResolvedValue({ count: 1 });
    database.transaction.mockImplementation(async (work) => {
      if (Array.isArray(work)) return Promise.all(work);
      return work({
        refreshSession: {
          updateMany: database.sessionUpdateMany,
          create: database.sessionCreate,
        },
      });
    });
    auth.verifyPassword.mockResolvedValue(true);
    auth.hashPassword.mockResolvedValue('new-hash');
  });

  it('bootstraps the first administrator and rejects later bootstrap attempts', async () => {
    const input = { name: 'Estate Admin', email: 'ADMIN@ESTATE.TEST', password: 'secure-password' };
    const created = await request(app()).post('/auth/bootstrap').send(input);
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      user: { id: user.id },
      token: `access:${user.id}:${user.role}`,
      refreshToken: 'r'.repeat(64),
    });

    database.userCount.mockResolvedValue(1);
    const duplicate = await request(app()).post('/auth/bootstrap').send(input);
    expect(duplicate.status).toBe(409);
  });

  it('validates bootstrap and registration payloads', async () => {
    expect((await request(app()).post('/auth/bootstrap').send({ email: 'invalid' })).status).toBe(400);
    expect((await request(app()).post('/auth/register').send({ name: 'x' })).status).toBe(400);
  });

  it('registers a user and rejects duplicate email addresses', async () => {
    database.userFindUnique.mockResolvedValueOnce(null);
    const input = {
      name: 'Property Manager',
      email: 'MANAGER@ESTATE.TEST',
      password: 'secure-password',
      role: 'MANAGER',
    };
    expect((await request(app()).post('/auth/register').send(input)).status).toBe(201);

    database.userFindUnique.mockResolvedValueOnce(user);
    expect((await request(app()).post('/auth/register').send(input)).status).toBe(409);
  });

  it('logs in valid users and rejects unknown or incorrect credentials', async () => {
    const credentials = { email: user.email, password: 'secure-password' };
    const loggedIn = await request(app()).post('/auth/login').send(credentials);
    expect(loggedIn.status).toBe(200);
    expect(loggedIn.body.expiresIn).toBe(900);

    database.userFindUnique.mockResolvedValueOnce(null);
    expect((await request(app()).post('/auth/login').send(credentials)).status).toBe(401);

    auth.verifyPassword.mockResolvedValueOnce(false);
    expect((await request(app()).post('/auth/login').send(credentials)).status).toBe(401);
  });

  it.each([
    null,
    { revokedAt: new Date(), rotatedAt: null, expiresAt: new Date(Date.now() + 60_000) },
    { revokedAt: null, rotatedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) },
    { revokedAt: null, rotatedAt: null, expiresAt: new Date(Date.now() - 60_000) },
  ])('rejects invalid refresh session state', async (state) => {
    database.sessionFindUnique.mockResolvedValue(
      state && { ...state, id: 'session-1', userId: user.id, user },
    );
    const response = await request(app()).post('/auth/refresh').send({ refreshToken: 'x'.repeat(64) });
    expect(response.status).toBe(401);
  });

  it('rotates refresh sessions and rejects a concurrent reuse', async () => {
    const rotated = await request(app()).post('/auth/refresh').send({ refreshToken: 'x'.repeat(64) });
    expect(rotated.status).toBe(200);
    expect(database.sessionCreate).toHaveBeenCalled();

    database.sessionUpdateMany.mockResolvedValue({ count: 0 });
    const reused = await request(app()).post('/auth/refresh').send({ refreshToken: 'x'.repeat(64) });
    expect(reused.status).toBe(401);
  });

  it('revokes refresh sessions during logout', async () => {
    const response = await request(app()).post('/auth/logout').send({ refreshToken: 'x'.repeat(64) });
    expect(response.status).toBe(204);
    expect(database.sessionUpdateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { revokedAt: expect.any(Date) },
    }));
  });

  it('returns the current user or a safe not-found response', async () => {
    expect((await request(app()).get('/auth/me')).status).toBe(200);
    database.userFindUnique.mockResolvedValueOnce(null);
    expect((await request(app()).get('/auth/me')).status).toBe(404);
  });

  it('changes a password, rejects bad credentials, and validates password reuse', async () => {
    const input = { currentPassword: 'old-password', newPassword: 'new-secure-password' };
    expect((await request(app()).post('/auth/change-password').send(input)).status).toBe(204);
    expect(database.userUpdate).toHaveBeenCalled();

    auth.verifyPassword.mockResolvedValueOnce(false);
    expect((await request(app()).post('/auth/change-password').send(input)).status).toBe(401);

    expect((await request(app()).post('/auth/change-password').send({
      currentPassword: 'same-password',
      newPassword: 'same-password',
    })).status).toBe(400);
  });
});
