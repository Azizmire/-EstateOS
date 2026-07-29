import { fileTypeFromBuffer } from 'file-type';

export class FileValidationService {
  async validate(buffer: Buffer, allowedMimeTypes: string[]): Promise<string> {
    const detected = await fileTypeFromBuffer(buffer);

    if (!detected) {
      throw new Error('Unable to determine uploaded file type.');
    }

    if (!allowedMimeTypes.includes(detected.mime)) {
      throw new Error(`Unsupported file type: ${detected.mime}`);
    }

    return detected.ext;
  }
}
