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
});
