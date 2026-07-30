import { UserRole } from '@prisma/client';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signToken } from '../src/lib/auth.js';
import { errorHandler } from '../src/middleware/error.js';

const database = vi.hoisted(() => ({
  fileFindMany: vi.fn(),
  fileFindUnique: vi.fn(),
  fileDelete: vi.fn(),
  tenantFindUnique: vi.fn(),
  leaseCount: vi.fn(),
  ownerFindUnique: vi.fn(),
}));

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    fileAsset: {
      findMany: database.fileFindMany,
      findUnique: database.fileFindUnique,
      delete: database.fileDelete,
    },
    tenant: { findUnique: database.tenantFindUnique },
    lease: { count: database.leaseCount },
    propertyOwner: { findUnique: database.ownerFindUnique },
    $disconnect: vi.fn(),
  },
}));

import { createFileRouter } from '../src/routes/files.js';

const storage = {
  putObject: vi.fn(),
  getObject: vi.fn(),
  deleteObject: vi.fn(),
  exists: vi.fn(),
};

function token(role: UserRole, id = `${role.toLowerCase()}-1`) {
  return signToken({ id, role });
}

function createApp() {
  const instance = express();
  instance.use(express.json());
  instance.use('/files', createFileRouter(storage));
  instance.use(errorHandler);
  return instance;
}

const file = {
  id: 'file-1',
  key: 'files/file.pdf',
  mimeType: 'application/pdf',
  originalFilename: 'lease.pdf',
  propertyImage: null,
  leaseDocument: null,
  maintenanceFile: null,
};

describe('file routes', () => {
  beforeEach(() => {
    database.fileFindMany.mockResolvedValue([]);
    database.fileFindUnique.mockResolvedValue(file);
    database.fileDelete.mockResolvedValue(file);
    database.tenantFindUnique.mockResolvedValue({ id: 'tenant-1' });
    database.leaseCount.mockResolvedValue(1);
    database.ownerFindUnique.mockResolvedValue({ userId: 'owner-1', propertyId: 'property-1' });
    storage.getObject.mockResolvedValue(Buffer.from('document'));
    storage.deleteObject.mockResolvedValue(undefined);
  });

  it.each([
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.MAINTENANCE,
    UserRole.TENANT,
    UserRole.OWNER,
  ])('lists files with role scope for %s', async (role) => {
    const response = await request(createApp())
      .get('/files?page=2&pageSize=5')
      .set('Authorization', `Bearer ${token(role)}`);

    expect(response.status).toBe(200);
    expect(response.body.pagination).toMatchObject({ page: 2, pageSize: 5 });
    expect(database.fileFindMany).toHaveBeenCalled();
  });

  it('returns an empty tenant list when the account is not linked', async () => {
    database.tenantFindUnique.mockResolvedValue(null);
    const response = await request(createApp())
      .get('/files')
      .set('Authorization', `Bearer ${token(UserRole.TENANT)}`);
    expect(response.status).toBe(200);
    expect(response.body.files).toEqual([]);
    expect(database.fileFindMany).not.toHaveBeenCalled();
  });

  it('streams files to unrestricted roles with private headers', async () => {
    const response = await request(createApp())
      .get('/files/file-1')
      .set('Authorization', `Bearer ${token(UserRole.ADMIN)}`);
    expect(response.status).toBe(200);
    expect(response.headers['cache-control']).toBe('private, max-age=300');
    expect(response.body).toEqual(Buffer.from('document'));
  });

  it('allows maintenance, tenant, and owner access to linked files', async () => {
    database.fileFindUnique
      .mockResolvedValueOnce({ ...file, maintenanceFile: { request: { tenantId: 'tenant-1', propertyId: 'property-1' } } })
      .mockResolvedValueOnce({ ...file, leaseDocument: { lease: { unit: { propertyId: 'property-1' }, tenants: [{ tenantId: 'tenant-1' }] } } })
      .mockResolvedValueOnce({ ...file, propertyImage: { propertyId: 'property-1' } });

    for (const role of [UserRole.MAINTENANCE, UserRole.TENANT, UserRole.OWNER]) {
      const response = await request(createApp())
        .get('/files/file-1')
        .set('Authorization', `Bearer ${token(role)}`);
      expect(response.status).toBe(200);
    }
  });

  it('rejects missing and unauthorized files', async () => {
    database.fileFindUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(file);
    expect((await request(createApp()).get('/files/missing').set('Authorization', `Bearer ${token(UserRole.ADMIN)}`)).status).toBe(404);
    expect((await request(createApp()).get('/files/file-1').set('Authorization', `Bearer ${token(UserRole.MAINTENANCE)}`)).status).toBe(403);
  });

  it('rejects unlinked tenant and owner access paths', async () => {
    database.fileFindUnique.mockResolvedValue({ ...file, propertyImage: { propertyId: 'property-1' } });
    database.leaseCount.mockResolvedValueOnce(0);
    expect((await request(createApp()).get('/files/file-1').set('Authorization', `Bearer ${token(UserRole.TENANT)}`)).status).toBe(403);

    database.tenantFindUnique.mockResolvedValueOnce(null);
    expect((await request(createApp()).get('/files/file-1').set('Authorization', `Bearer ${token(UserRole.TENANT)}`)).status).toBe(403);

    database.ownerFindUnique.mockResolvedValueOnce(null);
    expect((await request(createApp()).get('/files/file-1').set('Authorization', `Bearer ${token(UserRole.OWNER)}`)).status).toBe(403);
  });

  it('deletes stored files and their database records', async () => {
    const response = await request(createApp())
      .delete('/files/file-1')
      .set('Authorization', `Bearer ${token(UserRole.MANAGER)}`);
    expect(response.status).toBe(204);
    expect(storage.deleteObject).toHaveBeenCalledWith(file.key);
    expect(database.fileDelete).toHaveBeenCalledWith({ where: { id: file.id } });
  });

  it('returns not found when deleting a missing file', async () => {
    database.fileFindUnique.mockResolvedValueOnce(null);
    const response = await request(createApp())
      .delete('/files/missing')
      .set('Authorization', `Bearer ${token(UserRole.ADMIN)}`);
    expect(response.status).toBe(404);
    expect(storage.deleteObject).not.toHaveBeenCalled();
  });
});
