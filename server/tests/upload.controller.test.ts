import { describe, expect, it, vi } from 'vitest';
import { UploadController } from '../src/controllers/upload.controller.js';
import type { UploadControllerDependencies } from '../src/controllers/upload.controller.dependencies.js';

function dependencies() {
  return {
    fileValidationService: {
      validate: vi.fn().mockResolvedValue({ mimeType: 'application/pdf', extension: 'pdf' }),
    },
    imageService: {
      optimize: vi.fn().mockResolvedValue({
        buffer: Buffer.from('optimized'),
        mimeType: 'image/webp',
        extension: 'webp',
        width: 800,
        height: 600,
      }),
    },
    uploadService: {
      upload: vi.fn().mockResolvedValue({ key: 'properties/asset.webp', size: 9, mimeType: 'image/webp' }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    fileAssetService: {
      create: vi.fn().mockImplementation(async (input) => ({ id: 'file-1', ...input })),
      findById: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as UploadControllerDependencies;
}

const input = {
  buffer: Buffer.from('file'),
  filename: 'unit-photo.jpg',
  uploadedById: 'user-1',
  targetId: 'property-1',
  label: 'Front elevation',
};

describe('UploadController', () => {
  it('validates, optimizes, stores, and attaches a property image', async () => {
    const deps = dependencies();
    const controller = new UploadController(deps);

    await controller.uploadPropertyImage(input);

    expect(deps.fileValidationService.validate).toHaveBeenCalledWith(input.buffer, [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
    expect(deps.uploadService.upload).toHaveBeenCalledWith(
      Buffer.from('optimized'),
      'image/webp',
      'webp',
      'properties',
    );
    expect(deps.fileAssetService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'PROPERTY_IMAGE',
        targetId: 'property-1',
        uploadedById: 'user-1',
        label: 'Front elevation',
      }),
    );
  });

  it('removes the stored object when metadata persistence fails', async () => {
    const deps = dependencies();
    vi.mocked(deps.fileAssetService.create).mockRejectedValueOnce(new Error('database unavailable'));
    const controller = new UploadController(deps);

    await expect(controller.uploadPropertyImage(input)).rejects.toThrow('database unavailable');
    expect(deps.uploadService.delete).toHaveBeenCalledWith('properties/asset.webp');
  });

  it('uses detected document metadata for lease uploads', async () => {
    const deps = dependencies();
    vi.mocked(deps.uploadService.upload).mockResolvedValueOnce({
      key: 'leases/document.pdf',
      size: 4,
      mimeType: 'application/pdf',
    });
    const controller = new UploadController(deps);

    await controller.uploadLeaseDocument({ ...input, targetId: 'lease-1' });

    expect(deps.uploadService.upload).toHaveBeenCalledWith(
      input.buffer,
      'application/pdf',
      'pdf',
      'leases',
    );
    expect(deps.fileAssetService.create).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'LEASE_DOCUMENT', targetId: 'lease-1' }),
    );
  });
});
