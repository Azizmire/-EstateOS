import type { StorageProvider } from '../storage/provider.js';
import { buildStorageKey } from '../utils/file-names.js';

export class UploadService {
  constructor(private readonly storage: StorageProvider) {}

  async upload(buffer: Buffer, mimeType: string, extension: string, folder: string) {
    const key = buildStorageKey(folder, extension);

    return this.storage.putObject({
      key,
      data: buffer,
      mimeType,
    });
  }

  async delete(key: string): Promise<void> {
    await this.storage.deleteObject(key);
  }
}
