import { fileTypeFromBuffer } from 'file-type';
import { InvalidUploadError } from '../storage/storage-errors.js';

export type ValidatedFileType = {
  extension: string;
  mimeType: string;
};

export class FileValidationService {
  async validate(buffer: Buffer, allowedMimeTypes: readonly string[]): Promise<ValidatedFileType> {
    const detected = await fileTypeFromBuffer(buffer);

    if (!detected) {
      throw new InvalidUploadError('Unable to determine uploaded file type.');
    }

    if (!allowedMimeTypes.includes(detected.mime)) {
      throw new InvalidUploadError(`Unsupported file type: ${detected.mime}`);
    }

    return { extension: detected.ext, mimeType: detected.mime };
  }
}
