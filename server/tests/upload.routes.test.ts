import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { UploadControllerDependencies } from '../src/controllers/upload.controller.dependencies.js';
import { signToken } from '../src/lib/auth.js';
import { errorHandler } from '../src/middleware/error.js';
import { createUploadRouter } from '../src/routes/upload.routes.js';

function createTestApp() {
  const dependencies = {
    fileValidationService: {
      validate: vi.fn().mockResolvedValue({ mimeType: 'image/png', extension: 'png' }),
    },
    imageService: {
      optimize: vi.fn().mockResolvedValue({
        buffer: Buffer.from('optimized'),
        mimeType: 'image/webp',
        extension: 'webp',
        width: 100,
        height: 100,
      }),
    },
    uploadService: {
      upload: vi.fn().mockResolvedValue({ key: 'properties/file.webp', size: 9, mimeType: 'image/webp' }),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    fileAssetService: {
      create: vi.fn().mockResolvedValue({ id: 'file-1', category: 'PROPERTY_IMAGE' }),
      findById: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as UploadControllerDependencies;

  const app = express();
  app.use('/api/uploads', createUploadRouter(dependencies));
  app.use(errorHandler);
  return { app, dependencies };
}

const managerToken = signToken({ id: 'manager-1', role: 'MANAGER' });
const maintenanceToken = signToken({ id: 'tech-1', role: 'MAINTENANCE' });

describe('upload routes', () => {
  it('requires authentication before parsing multipart data', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .post('/api/uploads/property-image')
      .field('propertyId', 'property-1')
      .attach('file', Buffer.from('png'), { filename: 'photo.png', contentType: 'image/png' });

    expect(response.status).toBe(401);
  });

  it('accepts a manager property image multipart request', async () => {
    const { app, dependencies } = createTestApp();
    const response = await request(app)
      .post('/api/uploads/property-image')
      .set('Authorization', `Bearer ${managerToken}`)
      .field('propertyId', 'property-1')
      .field('altText', 'Front elevation')
      .attach('file', Buffer.from('png'), { filename: '../photo.png', contentType: 'image/png' });

    expect(response.status).toBe(201);
    expect(response.body.file.id).toBe('file-1');
    expect(dependencies.fileAssetService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'photo.png',
        uploadedById: 'manager-1',
        targetId: 'property-1',
      }),
    );
  });

  it('rejects roles without property upload permission', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .post('/api/uploads/property-image')
      .set('Authorization', `Bearer ${maintenanceToken}`)
      .field('propertyId', 'property-1')
      .attach('file', Buffer.from('png'), { filename: 'photo.png', contentType: 'image/png' });

    expect(response.status).toBe(403);
  });

  it('returns a validation error when the file field is missing', async () => {
    const { app } = createTestApp();
    const response = await request(app)
      .post('/api/uploads/property-image')
      .set('Authorization', `Bearer ${managerToken}`)
      .field('propertyId', 'property-1');

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('file');
  });
});
