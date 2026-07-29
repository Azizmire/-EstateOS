import type { FileAssetService } from '../services/file-asset.service.js';
import type { FileValidationService } from '../services/file-validation.service.js';
import type { ImageService } from '../services/image.service.js';
import type { UploadService } from '../services/upload.service.js';

export interface UploadControllerDependencies {
  uploadService: UploadService;
  imageService: ImageService;
  fileValidationService: FileValidationService;
  fileAssetService: FileAssetService;
}
