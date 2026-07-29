import type { UploadService } from '../services/upload.service';
import type { ImageService } from '../services/image.service';
import type { PrismaFileAssetService } from '../services/prisma-file-asset.service';

export interface UploadControllerDependencies {
  uploadService: UploadService;
  imageService: ImageService;
  fileAssetService: PrismaFileAssetService;
}
