import { Prisma } from '@prisma/client';
import express from 'express';
import multer from 'multer';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { errorHandler, notFound } from '../src/middleware/error.js';
import { FileValidationService } from '../src/services/file-validation.service.js';
import { ImageService } from '../src/services/image.service.js';
import { UploadService } from '../src/services/upload.service.js';
import { LocalStorageProvider } from '../src/storage/local.provider.js';
import { InvalidUploadError } from '../src/storage/storage-errors.js';
import { buildStorageKey, sanitizeFilename } from '../src/utils/file-names.js';

describe('storage and file services', () => {
  let directory = '';

  beforeEach(async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'estateos-storage-'));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it('stores, reads, checks, and deletes local objects safely', async () => {
    const storage = new LocalStorageProvider(directory);
    const saved = await storage.putObject({
      key: 'leases/document.txt',
      data: Buffer.from('estateos'),
      mimeType: 'text/plain',
    });
    expect(saved).toMatchObject({ key: 'leases/document.txt', size: 8 });
    expect(await storage.exists(saved.key)).toBe(true);
    expect((await storage.getObject(saved.key)).toString()).toBe('estateos');
    await storage.deleteObject(saved.key);
    expect(await storage.exists(saved.key)).toBe(false);
    await expect(storage.getObject('../outside.txt')).rejects.toThrow('Invalid storage key');
  });

  it('uploads through the storage provider and generates safe keys', async () => {
    const storage = {
      putObject: vi.fn().mockResolvedValue({ key: 'stored', size: 4, mimeType: 'text/plain' }),
      getObject: vi.fn(),
      deleteObject: vi.fn().mockResolvedValue(undefined),
      exists: vi.fn(),
    };
    const service = new UploadService(storage);
    expect(await service.upload(Buffer.from('test'), 'text/plain', 'txt', 'docs')).toMatchObject({ key: 'stored' });
    expect(storage.putObject).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'text/plain' }));
    await service.delete('stored');
    expect(storage.deleteObject).toHaveBeenCalledWith('stored');
    expect(sanitizeFilename('../bad name?.pdf')).toBe('bad_name_.pdf');
    expect(buildStorageKey('docs', 'pdf')).toMatch(/^docs\/\d{4}\/\d{2}\/[\w-]+\.pdf$/);
  });

  it('validates real file signatures and rejects unsupported content', async () => {
    const png = await sharp({ create: { width: 2, height: 2, channels: 4, background: '#fff' } }).png().toBuffer();
    const validator = new FileValidationService();
    await expect(validator.validate(png, ['image/png'])).resolves.toEqual({ extension: 'png', mimeType: 'image/png' });
    await expect(validator.validate(png, ['application/pdf'])).rejects.toThrow('Unsupported file type');
    await expect(validator.validate(Buffer.from('plain text'), ['text/plain'])).rejects.toThrow('Unable to determine');
  });

  it('optimizes images and creates square thumbnails', async () => {
    const source = await sharp({ create: { width: 40, height: 20, channels: 4, background: '#0f0' } }).png().toBuffer();
    const images = new ImageService();
    const optimized = await images.optimize(source, 10);
    expect(optimized).toMatchObject({ mimeType: 'image/webp', extension: 'webp', width: 10, height: 5 });
    const thumbnail = await images.thumbnail(source, 8);
    expect(thumbnail).toMatchObject({ width: 8, height: 8 });
  });
});

describe('HTTP error handling', () => {
  function appFor(error: unknown) {
    const app = express();
    app.get('/error', () => { throw error; });
    app.use(notFound);
    app.use(errorHandler);
    return app;
  }

  it.each([
    [z.object({ name: z.string() }).safeParse({}).error, 400],
    [new InvalidUploadError('bad upload'), 400],
    [new multer.MulterError('LIMIT_FILE_SIZE'), 413],
    [new multer.MulterError('LIMIT_UNEXPECTED_FILE'), 400],
    [Object.assign(new Error('not allowed'), { statusCode: 403 }), 403],
  ])('maps expected errors to safe HTTP responses', async (error, status) => {
    expect((await request(appFor(error)).get('/error')).status).toBe(status);
  });

  it.each(['P2002', 'P2003', 'P2025'])('maps Prisma error %s', async (code) => {
    const error = new Prisma.PrismaClientKnownRequestError('database error', {
      code,
      clientVersion: '6.19.3',
    });
    const expected = code === 'P2002' ? 409 : code === 'P2003' ? 400 : 404;
    expect((await request(appFor(error)).get('/error')).status).toBe(expected);
  });

  it('returns a generic 500 without exposing internal details', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(appFor(new Error('secret detail'))).get('/error');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ message: 'Internal server error' });
  });

  it('returns a descriptive 404 for unmatched routes', async () => {
    const response = await request(appFor(null)).post('/missing');
    expect(response.status).toBe(404);
    expect(response.body.message).toContain('POST /missing');
  });
});
