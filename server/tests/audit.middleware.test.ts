import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createAuditMiddleware } from '../src/middleware/audit.js';
import type { AuditService } from '../src/services/audit.service.js';

function createApp(record: AuditService['record']) {
  const app = express();
  app.use(createAuditMiddleware({ record }));
  app.use((req, _res, next) => {
    req.user = { id: 'manager-1', role: 'MANAGER' };
    next();
  });
  app.get('/api/properties', (_req, res) => res.json({}));
  app.patch('/api/properties/:id', (_req, res) => res.json({ id: 'property-1' }));
  return app;
}

function createFailureApp(record: AuditService['record'], withUser = true) {
  const app = express();
  app.use(createAuditMiddleware({ record }));
  if (withUser) {
    app.use((req, _res, next) => {
      req.user = { id: 'manager-1', role: 'MANAGER' };
      next();
    });
  }
  app.post('/api/properties', (_req, res) => res.status(201).json({ id: 'property-1' }));
  app.delete('/api/properties/:id', (_req, res) => res.status(500).json({ message: 'failed' }));
  return app;
}

describe('audit middleware', () => {
  it('records successful mutating requests after authorization', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    const response = await request(createApp(record)).patch('/api/properties/property-1');

    expect(response.status).toBe(200);
    await vi.waitFor(() => expect(record).toHaveBeenCalledOnce());
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'manager-1',
        action: 'PATCH /api/properties/:id',
        metadata: { statusCode: 200 },
      }),
    );
  });

  it('does not record read-only requests', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    await request(createApp(record)).get('/api/properties');
    expect(record).not.toHaveBeenCalled();
  });

  it('does not audit unauthenticated or failed server requests', async () => {
    const record = vi.fn().mockResolvedValue(undefined);
    expect((await request(createFailureApp(record, false)).post('/api/properties')).status).toBe(201);
    expect((await request(createFailureApp(record)).delete('/api/properties/property-1')).status).toBe(500);
    expect(record).not.toHaveBeenCalled();
  });

  it('returns a durable-audit warning when persistence fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const record = vi.fn().mockRejectedValue(new Error('audit database unavailable'));
    const response = await request(createFailureApp(record)).post('/api/properties');
    expect(response.status).toBe(503);
    expect(response.body.message).toContain('audit record could not be persisted');
  });
});
