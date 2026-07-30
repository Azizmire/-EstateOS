import type { FileAsset } from '@prisma/client';
import type { UploadFileInput } from './upload.controller.types.js';

export interface UploadController {
  uploadPropertyImage(input: UploadFileInput): Promise<FileAsset>;
  uploadLeaseDocument(input: UploadFileInput): Promise<FileAsset>;
  uploadMaintenanceAttachment(input: UploadFileInput): Promise<FileAsset>;
}
