import type { StoredFileMetadata } from '../storage/storage-metadata';

export interface CreateFileAssetInput extends StoredFileMetadata {
  uploadedById?: string;
  category: 'PROPERTY_IMAGE' | 'LEASE_DOCUMENT' | 'MAINTENANCE_ATTACHMENT';
}

export interface FileAssetService {
  create(input: CreateFileAssetInput): Promise<unknown>;
  findById(id: string): Promise<unknown>;
  delete(id: string): Promise<void>;
}
