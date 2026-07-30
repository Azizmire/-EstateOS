import { beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  create: vi.fn(),
  findUnique: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    fileAsset: database,
    $disconnect: vi.fn(),
  },
}));

import { PrismaFileAssetService } from '../src/services/prisma-file-asset.service.js';

const baseInput = {
  uploadedById: 'user-1',
  targetId: 'target-1',
  key: 'folder/file.pdf',
  filename: 'file.pdf',
  mimeType: 'application/pdf',
  extension: 'pdf',
  size: 100,
  checksum: 'checksum',
  uploadedAt: new Date('2026-07-29T00:00:00.000Z'),
};

describe('PrismaFileAssetService', () => {
  const service = new PrismaFileAssetService();

  beforeEach(() => {
    database.create.mockImplementation(async ({ data }) => ({ id: 'file-1', ...data }));
    database.findUnique.mockResolvedValue({ id: 'file-1', key: baseInput.key });
    database.delete.mockResolvedValue({ id: 'file-1' });
  });

  it.each([
    ['PROPERTY_IMAGE', 'propertyImage', { create: { propertyId: 'target-1', altText: 'Label' } }],
    ['LEASE_DOCUMENT', 'leaseDocument', { create: { leaseId: 'target-1', title: 'Label' } }],
    ['MAINTENANCE_ATTACHMENT', 'maintenanceFile', { create: { requestId: 'target-1', caption: 'Label' } }],
  ] as const)('creates %s relations', async (category, relation, expected) => {
    await service.create({ ...baseInput, category, label: 'Label' });
    expect(database.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ category, [relation]: expected }),
    });
  });

  it('finds and deletes persisted file assets', async () => {
    await expect(service.findById('file-1')).resolves.toMatchObject({ id: 'file-1' });
    await service.delete('file-1');
    expect(database.delete).toHaveBeenCalledWith({ where: { id: 'file-1' } });
  });

  it('throws a typed error when the file does not exist', async () => {
    database.findUnique.mockResolvedValue(null);
    await expect(service.findById('missing')).rejects.toThrow('File not found: missing');
  });
});
