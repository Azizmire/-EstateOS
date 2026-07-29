import type { FileAsset, FileCategory } from '@prisma/client';
import type { StoredFileMetadata } from '../storage/storage-metadata.js';

export interface CreateFileAssetInput extends StoredFileMetadata {
  uploadedById?: string;
  category: FileCategory;
  targetId: string;
  label?: string;
}

export interface FileAssetService {
  create(input: CreateFileAssetInput): Promise<FileAsset>;
  findById(id: string): Promise<FileAsset>;
  delete(id: string): Promise<void>;
}
