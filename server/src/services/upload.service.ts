import { randomUUID } from 'node:crypto';
import { fileTypeFromBuffer } from 'file-type';
import { StorageProvider } from '../storage/provider.js';

export class UploadService {
  constructor(private readonly storage: StorageProvider) {}

  async upload(buffer: Buffer, mimeType: string, extension = 'bin') {
    const detected = await fileTypeFromBuffer(buffer);

    if (detected && detected.mime !== mimeType) {
      throw new Error('Uploaded file type does not match content.');
    }

    const key = `${randomUUID()}.${extension}`;

    return this.storage.putObject({
      key,
      data: buffer,
      mimeType
    });
  }
}
