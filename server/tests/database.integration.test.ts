import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

const runDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';
const password = 'EstateOS-Integration-Password!';
let adminToken = '';
let managerToken = '';
let tenantToken = '';
let ownerToken = '';
let maintenanceToken = '';
let propertyId = '';
let unitId = '';
let tenantId = '';
let leaseId = '';
let maintenanceId = '';

async function login(email: string) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  expect(response.status).toBe(200);
  expect(response.body.refreshToken).toHaveLength(64);
  return response.body;
}

describe.skipIf(!runDatabaseTests)('PostgreSQL role workflow integration', () => {
  beforeAll(async () => {
    await prisma.$connect();
    await prisma.auditLog.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.maintenanceUpdate.deleteMany();
    await prisma.maintenanceAttachment.deleteMany();
    await prisma.maintenanceRequest.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.leaseDocument.deleteMany();
    await prisma.leaseTenant.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.tenant.deleteMany();
    await prisma.propertyImage.deleteMany();
    await prisma.fileAsset.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.propertyOwner.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('executes Admin, Manager, Owner, Tenant, and Maintenance workflows', async () => {
    const bootstrap = await request(app).post('/api/auth/bootstrap').send({
      name: 'Integration Admin',
      email: 'admin@integration.test',
      password,
    });
    expect(bootstrap.status).toBe(201);
    adminToken = bootstrap.body.token;

    for (const [name, email, role] of [
      ['Integration Manager', 'manager@integration.test', 'MANAGER'],
      ['Integration Tenant', 'tenant@integration.test', 'TENANT'],
      ['Integration Owner', 'owner@integration.test', 'OWNER'],
      ['Integration Technician', 'maintenance@integration.test', 'MAINTENANCE'],
    ]) {
      const registered = await request(app)
        .post('/api/auth/register')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name, email, password, role });
      expect(registered.status).toBe(201);
    }

    managerToken = (await login('manager@integration.test')).token;
    tenantToken = (await login('tenant@integration.test')).token;
    ownerToken = (await login('owner@integration.test')).token;
    maintenanceToken = (await login('maintenance@integration.test')).token;

    const property = await request(app)
      .post('/api/properties')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        name: 'Integration Apartments',
        address1: '100 Test Avenue',
        city: 'Minneapolis',
        state: 'MN',
        postalCode: '55401',
        unitCount: 2,
      });
    expect(property.status).toBe(201);
    expect(property.body.property.units).toHaveLength(2);
    propertyId = property.body.property.id;
    unitId = property.body.property.units[0].id;

    const tenant = await request(app)
      .post('/api/tenants')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ firstName: 'Integration', lastName: 'Resident', email: 'resident@integration.test' });
    expect(tenant.status).toBe(201);
    tenantId = tenant.body.tenant.id;

    const users = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${adminToken}`);
    const tenantUser = users.body.users.find((user: { email: string }) => user.email === 'tenant@integration.test');
    const ownerUser = users.body.users.find((user: { email: string }) => user.email === 'owner@integration.test');
    const maintenanceUser = users.body.users.find((user: { email: string }) => user.email === 'maintenance@integration.test');
    expect((await request(app).patch(`/api/admin/users/${tenantUser.id}/access`).set('Authorization', `Bearer ${adminToken}`).send({ role: 'TENANT', tenantId })).status).toBe(200);
    expect((await request(app).patch(`/api/admin/users/${ownerUser.id}/access`).set('Authorization', `Bearer ${adminToken}`).send({ role: 'OWNER', propertyIds: [propertyId] })).status).toBe(200);
    expect((await request(app).get(`/api/properties/${propertyId}`).set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).patch(`/api/properties/${propertyId}`).set('Authorization', `Bearer ${managerToken}`).send({ description: 'Updated by integration test' })).status).toBe(200);
    const addedUnit = await request(app).post(`/api/properties/${propertyId}/units`).set('Authorization', `Bearer ${managerToken}`).send({ number: 'PH', bedrooms: 2, bathrooms: 2, marketRent: 2400 });
    expect(addedUnit.status).toBe(201);
    expect((await request(app).patch(`/api/properties/${propertyId}/units/${addedUnit.body.unit.id}`).set('Authorization', `Bearer ${managerToken}`).send({ marketRent: 2500 })).status).toBe(200);
    expect((await request(app).delete(`/api/properties/${propertyId}/units/${addedUnit.body.unit.id}`).set('Authorization', `Bearer ${managerToken}`)).status).toBe(204);
    expect((await request(app).get('/api/tenants?page=1&pageSize=10').set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/tenants/${tenantId}`).set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).patch(`/api/tenants/${tenantId}`).set('Authorization', `Bearer ${managerToken}`).send({ phone: '612-555-0199' })).status).toBe(200);

    const lease = await request(app)
      .post('/api/leases')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        unitId,
        tenantIds: [tenantId],
        primaryTenantId: tenantId,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 86_400_000).toISOString(),
        monthlyRent: 1800,
        securityDeposit: 1800,
        status: 'DRAFT',
      });
    expect(lease.status).toBe(201);
    leaseId = lease.body.lease.id;
    expect((await request(app).get('/api/leases').set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/leases/${leaseId}`).set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).patch(`/api/leases/${leaseId}`).set('Authorization', `Bearer ${managerToken}`).send({ notes: 'Integration lease' })).status).toBe(200);
    expect((await request(app).post(`/api/leases/${leaseId}/activate`).set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);

    const payment = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ tenantId, leaseId, amount: 1800, dueDate: new Date().toISOString(), type: 'RENT', status: 'PAID' });
    expect(payment.status).toBe(201);
    expect((await request(app).get(`/api/payments/${payment.body.payment.id}`).set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).get('/api/payments/summary').set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).patch(`/api/payments/${payment.body.payment.id}`).set('Authorization', `Bearer ${managerToken}`).send({ notes: 'Reconciled' })).status).toBe(200);
    const pendingPayment = await request(app).post('/api/payments').set('Authorization', `Bearer ${managerToken}`).send({ tenantId, leaseId, amount: 25, dueDate: new Date(Date.now() + 86_400_000).toISOString(), type: 'OTHER', status: 'PENDING' });
    expect((await request(app).post(`/api/payments/${pendingPayment.body.payment.id}/mark-paid`).set('Authorization', `Bearer ${managerToken}`).send({ reference: 'integration' })).status).toBe(200);

    const tenantPortal = await request(app).get('/api/portal/tenant').set('Authorization', `Bearer ${tenantToken}`);
    expect(tenantPortal.status).toBe(200);
    expect(tenantPortal.body.tenant.id).toBe(tenantId);

    const maintenance = await request(app)
      .post('/api/portal/tenant/maintenance')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ unitId, title: 'Integration water leak', description: 'Water is leaking under the integration-test sink.', priority: 'HIGH' });
    expect(maintenance.status).toBe(201);
    maintenanceId = maintenance.body.request.id;

    expect((await request(app).get(`/api/maintenance/${maintenanceId}`).set('Authorization', `Bearer ${maintenanceToken}`)).status).toBe(200);
    expect((await request(app).patch(`/api/maintenance/${maintenanceId}`).set('Authorization', `Bearer ${managerToken}`).send({ assignedTechnicianId: maintenanceUser.id, status: 'ASSIGNED' })).status).toBe(200);
    expect((await request(app).get('/api/maintenance').set('Authorization', `Bearer ${maintenanceToken}`)).status).toBe(200);
    expect((await request(app).get('/api/maintenance/summary').set('Authorization', `Bearer ${maintenanceToken}`)).status).toBe(200);
    expect((await request(app).post(`/api/maintenance/${maintenanceId}/updates`).set('Authorization', `Bearer ${maintenanceToken}`).send({ message: 'Technician started work.', status: 'IN_PROGRESS' })).status).toBe(201);
    const notifications = await request(app).get('/api/notifications?unread=true').set('Authorization', `Bearer ${maintenanceToken}`);
    expect(notifications.status).toBe(200);
    if (notifications.body.notifications[0]) {
      expect((await request(app).patch(`/api/notifications/${notifications.body.notifications[0].id}/read`).set('Authorization', `Bearer ${maintenanceToken}`)).status).toBe(200);
    }
    expect((await request(app).post('/api/notifications/read-all').set('Authorization', `Bearer ${maintenanceToken}`)).status).toBe(200);

    const expense = await request(app).post('/api/expenses').set('Authorization', `Bearer ${managerToken}`).send({ propertyId, category: 'MAINTENANCE', amount: 125, incurredAt: new Date().toISOString(), vendor: 'Integration Vendor', description: 'Integration repair expense' });
    expect(expense.status).toBe(201);
    expect((await request(app).get('/api/expenses').set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).get(`/api/expenses/${expense.body.expense.id}`).set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).patch(`/api/expenses/${expense.body.expense.id}`).set('Authorization', `Bearer ${managerToken}`).send({ amount: 135 })).status).toBe(200);
    expect((await request(app).delete(`/api/expenses/${expense.body.expense.id}`).set('Authorization', `Bearer ${managerToken}`)).status).toBe(204);

    const ownerPortal = await request(app).get('/api/portal/owner').set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerPortal.status).toBe(200);
    expect(ownerPortal.body.properties[0].id).toBe(propertyId);

    expect((await request(app).get('/api/dashboard').set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).get('/api/reports/portfolio').set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).get('/api/reports/financial').set('Authorization', `Bearer ${managerToken}`)).status).toBe(200);
    expect((await request(app).get('/api/admin/audit').set('Authorization', `Bearer ${adminToken}`)).body.logs.length).toBeGreaterThan(0);
    expect((await request(app).get('/api/admin/metrics').set('Authorization', `Bearer ${adminToken}`)).status).toBe(200);

    const session = await login('manager@integration.test');
    const rotated = await request(app).post('/api/auth/refresh').send({ refreshToken: session.refreshToken });
    expect(rotated.status).toBe(200);
    expect(rotated.body.refreshToken).not.toBe(session.refreshToken);
    expect((await request(app).post('/api/auth/refresh').send({ refreshToken: session.refreshToken })).status).toBe(401);
    expect((await request(app).post('/api/auth/logout').send({ refreshToken: rotated.body.refreshToken })).status).toBe(204);
  });
});
