import sharp from 'sharp';

export type ProcessedImage = {
  buffer: Buffer;
  mimeType: 'image/webp';
  extension: 'webp';
  width?: number;
  height?: number;
};

export class ImageService {
  async optimize(buffer: Buffer, maxWidth = 1920): Promise<ProcessedImage> {
    const image = sharp(buffer, { failOn: 'error' }).rotate();
    const metadata = await image.metadata();

    const output = await image
      .resize({
        width: Math.min(metadata.width ?? maxWidth, maxWidth),
        withoutEnlargement: true
      })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: output.data,
      mimeType: 'image/webp',
      extension: 'webp',
      width: output.info.width,
      height: output.info.height
    };
  }

  async thumbnail(buffer: Buffer, size = 480): Promise<ProcessedImage> {
    const output = await sharp(buffer, { failOn: 'error' })
      .rotate()
      .resize(size, size, { fit: 'cover', position: 'centre' })
      .webp({ quality: 78 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: output.data,
      mimeType: 'image/webp',
      extension: 'webp',
      width: output.info.width,
      height: output.info.height
    };
  }
}
