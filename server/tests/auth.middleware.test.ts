import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { signToken } from '../src/lib/auth.js';
import { requireAuth, requireRole } from '../src/middleware/auth.js';

function createApp() {
  const app = express();
  app.get(
    '/admin',
    requireAuth,
    requireRole('ADMIN'),
    (req, res) => res.json({ user: req.user }),
  );
  return app;
}

describe('authentication and authorization middleware', () => {
  it('rejects requests without a bearer token', async () => {
    const response = await request(createApp()).get('/admin');
    expect(response.status).toBe(401);
  });

  it('rejects an authenticated user without the required role', async () => {
    const token = signToken({ id: 'manager-1', role: 'MANAGER' });
    const response = await request(createApp())
      .get('/admin')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  it('attaches the verified user for an authorized request', async () => {
    const token = signToken({ id: 'admin-1', role: 'ADMIN' });
    const response = await request(createApp())
      .get('/admin')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ id: 'admin-1', role: 'ADMIN' });
  });
});
