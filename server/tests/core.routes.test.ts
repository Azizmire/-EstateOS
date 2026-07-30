import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signToken } from '../src/lib/auth.js';
import { errorHandler } from '../src/middleware/error.js';

const database = vi.hoisted(() => ({
  propertyFindMany: vi.fn(),
  tenantFindMany: vi.fn(),
  tenantFindFirst: vi.fn(),
  leaseFindMany: vi.fn(),
  leaseFindFirst: vi.fn(),
  paymentFindMany: vi.fn(),
  maintenanceFindMany: vi.fn(),
  maintenanceCreate: vi.fn(),
  notificationFindMany: vi.fn(),
  notificationCount: vi.fn(),
  ownerFindMany: vi.fn(),
  userFindMany: vi.fn(),
  auditFindMany: vi.fn(),
}));

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    property: { findMany: database.propertyFindMany },
    tenant: { findMany: database.tenantFindMany, findFirst: database.tenantFindFirst },
    lease: { findMany: database.leaseFindMany, findFirst: database.leaseFindFirst },
    payment: { findMany: database.paymentFindMany },
    maintenanceRequest: { findMany: database.maintenanceFindMany, create: database.maintenanceCreate },
    notification: { findMany: database.notificationFindMany, count: database.notificationCount },
    propertyOwner: { findMany: database.ownerFindMany },
    user: { findMany: database.userFindMany },
    auditLog: { findMany: database.auditFindMany },
    $disconnect: vi.fn(),
  },
}));

import adminRoutes from '../src/routes/admin.js';
import leaseRoutes from '../src/routes/leases.js';
import maintenanceRoutes from '../src/routes/maintenance.js';
import notificationRoutes from '../src/routes/notifications.js';
import paymentRoutes from '../src/routes/payments.js';
import portalRoutes from '../src/routes/portal.js';
import propertyRoutes from '../src/routes/properties.js';
import tenantRoutes from '../src/routes/tenants.js';

function app() {
  const instance = express();
  instance.use(express.json());
  instance.use('/properties', propertyRoutes);
  instance.use('/tenants', tenantRoutes);
  instance.use('/leases', leaseRoutes);
  instance.use('/payments', paymentRoutes);
  instance.use('/maintenance', maintenanceRoutes);
  instance.use('/notifications', notificationRoutes);
  instance.use('/portal', portalRoutes);
  instance.use('/admin', adminRoutes);
  instance.use(errorHandler);
  return instance;
}

const token = (role: 'ADMIN' | 'MANAGER' | 'MAINTENANCE' | 'TENANT' | 'OWNER') =>
  signToken({ id: `${role.toLowerCase()}-1`, role });

describe('core resource routes', () => {
  beforeEach(() => {
    database.propertyFindMany.mockResolvedValue([]);
    database.tenantFindMany.mockResolvedValue([]);
    database.leaseFindMany.mockResolvedValue([]);
    database.paymentFindMany.mockResolvedValue([]);
    database.maintenanceFindMany.mockResolvedValue([]);
    database.notificationFindMany.mockResolvedValue([]);
    database.notificationCount.mockResolvedValue(0);
  });

  it.each([
    ['/properties', 'properties'],
    ['/tenants', 'tenants'],
    ['/leases', 'leases'],
    ['/payments', 'payments'],
    ['/maintenance', 'requests'],
    ['/notifications', 'notifications'],
  ])('returns the authorized %s collection', async (path, key) => {
    const response = await request(app()).get(path).set('Authorization', `Bearer ${token('MANAGER')}`);
    expect(response.status).toBe(200);
    expect(response.body[key]).toEqual([]);
  });

  it('allows maintenance staff into the service queue but not resident records', async () => {
    const service = await request(app()).get('/maintenance').set('Authorization', `Bearer ${token('MAINTENANCE')}`);
    const residents = await request(app()).get('/tenants').set('Authorization', `Bearer ${token('MAINTENANCE')}`);
    expect(service.status).toBe(200);
    expect(residents.status).toBe(403);
  });

  it('returns an account-linked tenant portal', async () => {
    database.tenantFindFirst.mockResolvedValueOnce({ id: 'tenant-1', leases: [], payments: [], maintenance: [] });
    const response = await request(app()).get('/portal/tenant').set('Authorization', `Bearer ${token('TENANT')}`);
    expect(response.status).toBe(200);
    expect(response.body.tenant.id).toBe('tenant-1');
  });

  it('creates a tenant-scoped maintenance request for an active unit', async () => {
    database.tenantFindFirst.mockResolvedValueOnce({ id: 'tenant-1' });
    database.leaseFindFirst.mockResolvedValueOnce({ unitId: 'clunit0000000000000000001', unit: { propertyId: 'clprop0000000000000000001' } });
    database.maintenanceCreate.mockResolvedValueOnce({ id: 'request-1' });
    const response = await request(app())
      .post('/portal/tenant/maintenance')
      .set('Authorization', `Bearer ${token('TENANT')}`)
      .send({
        unitId: 'clunit0000000000000000001',
        title: 'Water leak',
        description: 'Water is leaking beneath the bathroom sink.',
        priority: 'HIGH',
      });
    expect(response.status).toBe(201);
    expect(response.body.request.id).toBe('request-1');
  });

  it('returns only assigned owner properties', async () => {
    database.ownerFindMany.mockResolvedValueOnce([]);
    const response = await request(app()).get('/portal/owner').set('Authorization', `Bearer ${token('OWNER')}`);
    expect(response.status).toBe(200);
    expect(response.body.properties).toEqual([]);
  });

  it('exposes users and audit history only to administrators', async () => {
    database.userFindMany.mockResolvedValueOnce([]);
    database.auditFindMany.mockResolvedValueOnce([]);
    const users = await request(app()).get('/admin/users').set('Authorization', `Bearer ${token('ADMIN')}`);
    const logs = await request(app()).get('/admin/audit').set('Authorization', `Bearer ${token('ADMIN')}`);
    const denied = await request(app()).get('/admin/users').set('Authorization', `Bearer ${token('MANAGER')}`);
    expect(users.status).toBe(200);
    expect(logs.status).toBe(200);
    expect(denied.status).toBe(403);
  });
});
