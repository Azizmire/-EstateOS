import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { signToken } from '../src/lib/auth.js';
import { errorHandler } from '../src/middleware/error.js';

const database = vi.hoisted(() => ({
  payments: vi.fn(),
  expenses: vi.fn(),
}));

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    payment: { findMany: database.payments },
    expense: { findMany: database.expenses },
    property: { count: vi.fn() },
    unit: { groupBy: vi.fn() },
    lease: { groupBy: vi.fn() },
    maintenanceRequest: { groupBy: vi.fn() },
    $disconnect: vi.fn(),
  },
}));

import reportRoutes from '../src/routes/reports.js';

function createApp() {
  const app = express();
  app.use('/api/reports', reportRoutes);
  app.use(errorHandler);
  return app;
}

describe('report routes', () => {
  it('returns a financial report to managers', async () => {
    database.payments.mockResolvedValueOnce([
      { amount: 1000, paidAt: new Date('2026-01-05T00:00:00Z') },
    ]);
    database.expenses.mockResolvedValueOnce([
      { amount: 250, incurredAt: new Date('2026-01-06T00:00:00Z') },
    ]);
    const token = signToken({ id: 'manager-1', role: 'MANAGER' });

    const response = await request(createApp())
      .get('/api/reports/financial?from=2026-01-01&to=2026-01-31')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.report.totals).toEqual({
      revenue: 1000,
      expenses: 250,
      net: 750,
    });
  });

  it('denies financial reports to non-management roles', async () => {
    const token = signToken({ id: 'tech-1', role: 'MAINTENANCE' });
    const response = await request(createApp())
      .get('/api/reports/financial')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });
});
