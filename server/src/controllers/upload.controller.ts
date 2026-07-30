import {
  DOCUMENT_MIME_TYPES,
  IMAGE_MIME_TYPES,
  LEASE_UPLOAD_FOLDER,
  MAINTENANCE_UPLOAD_FOLDER,
  PROPERTY_UPLOAD_FOLDER,
} from '../constants/upload.constants.js';
import { createHash } from 'node:crypto';
import type { CreateFileAssetInput } from '../services/file-asset.service.js';
import type { UploadController as UploadControllerContract } from './upload.controller.contract.js';
import type { UploadControllerDependencies } from './upload.controller.dependencies.js';
import type { UploadFileInput } from './upload.controller.types.js';

export class UploadController implements UploadControllerContract {
  constructor(private readonly dependencies: UploadControllerDependencies) {}

  async uploadPropertyImage(input: UploadFileInput) {
    await this.dependencies.malwareScanner?.scan(input.buffer);
    await this.dependencies.fileValidationService.validate(input.buffer, IMAGE_MIME_TYPES);
    const image = await this.dependencies.imageService.optimize(input.buffer);
    const stored = await this.dependencies.uploadService.upload(
      image.buffer,
      image.mimeType,
      image.extension,
      PROPERTY_UPLOAD_FOLDER,
    );

    return this.persist(stored.key, {
      uploadedById: input.uploadedById,
      targetId: input.targetId,
      label: input.label,
      category: 'PROPERTY_IMAGE',
      key: stored.key,
      filename: input.filename,
      mimeType: stored.mimeType,
      extension: image.extension,
      size: stored.size,
      checksum: createHash('sha256').update(image.buffer).digest('hex'),
      width: image.width,
      height: image.height,
      uploadedAt: new Date(),
    });
  }

  async uploadLeaseDocument(input: UploadFileInput) {
    const detected = await this.dependencies.fileValidationService.validate(
      input.buffer,
      DOCUMENT_MIME_TYPES,
    );
    return this.uploadFile(input, 'LEASE_DOCUMENT', LEASE_UPLOAD_FOLDER, detected);
  }

  async uploadMaintenanceAttachment(input: UploadFileInput) {
    const detected = await this.dependencies.fileValidationService.validate(
      input.buffer,
      [...IMAGE_MIME_TYPES, ...DOCUMENT_MIME_TYPES],
    );
    return this.uploadFile(input, 'MAINTENANCE_ATTACHMENT', MAINTENANCE_UPLOAD_FOLDER, detected);
  }

  private async uploadFile(
    input: UploadFileInput,
    category: 'LEASE_DOCUMENT' | 'MAINTENANCE_ATTACHMENT',
    folder: string,
    detected: { mimeType: string; extension: string },
  ) {
    await this.dependencies.malwareScanner?.scan(input.buffer);
    const stored = await this.dependencies.uploadService.upload(
      input.buffer,
      detected.mimeType,
      detected.extension,
      folder,
    );

    return this.persist(stored.key, {
      uploadedById: input.uploadedById,
      targetId: input.targetId,
      label: input.label,
      category,
      key: stored.key,
      filename: input.filename,
      mimeType: stored.mimeType,
      extension: detected.extension,
      size: stored.size,
      checksum: createHash('sha256').update(input.buffer).digest('hex'),
      uploadedAt: new Date(),
    });
  }

  private async persist(key: string, input: CreateFileAssetInput) {
    try {
      return await this.dependencies.fileAssetService.create(input);
    } catch (error) {
      await this.dependencies.uploadService.delete(key).catch(() => undefined);
      throw error;
    }
  }
}
