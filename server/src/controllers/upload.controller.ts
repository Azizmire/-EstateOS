import type { UploadController as UploadControllerContract } from './upload.controller.contract';
import type { UploadControllerDependencies } from './upload.controller.dependencies';

export type UploadFileInput = {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  extension: string;
  uploadedById?: string;
};

export class UploadController implements UploadControllerContract {
  constructor(private readonly dependencies: UploadControllerDependencies) {}

  async uploadPropertyImage(input: UploadFileInput) {
    const image = await this.dependencies.imageService.optimize(input.buffer);
    const stored = await this.dependencies.uploadService.upload(
      image.buffer,
      image.mimeType,
      image.extension,
    );

    return this.dependencies.fileAssetService.create({
      uploadedById: input.uploadedById,
      category: 'PROPERTY_IMAGE',
      key: stored.key,
      filename: input.filename,
      mimeType: stored.mimeType,
      extension: image.extension,
      size: stored.size,
      width: image.width,
      height: image.height,
      uploadedAt: new Date(),
    });
  }

  async uploadLeaseDocument(input: UploadFileInput) {
    return this.uploadFile(input, 'LEASE_DOCUMENT');
  }

  async uploadMaintenanceAttachment(input: UploadFileInput) {
    return this.uploadFile(input, 'MAINTENANCE_ATTACHMENT');
  }

  private async uploadFile(
    input: UploadFileInput,
    category: 'LEASE_DOCUMENT' | 'MAINTENANCE_ATTACHMENT',
  ) {
    const stored = await this.dependencies.uploadService.upload(
      input.buffer,
      input.mimeType,
      input.extension,
    );

    return this.dependencies.fileAssetService.create({
      uploadedById: input.uploadedById,
      category,
      key: stored.key,
      filename: input.filename,
      mimeType: stored.mimeType,
      extension: input.extension,
      size: stored.size,
      uploadedAt: new Date(),
    });
  }
}
