import type { FileAsset } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { FileNotFoundError } from '../storage/storage-errors';
import type {
  CreateFileAssetInput,
  FileAssetService,
} from './file-asset.service';

export class PrismaFileAssetService implements FileAssetService {
  async create(input: CreateFileAssetInput): Promise<FileAsset> {
    return prisma.fileAsset.create({
      data: {
        uploadedById: input.uploadedById,
        category: input.category,
        key: input.key,
        originalFilename: input.filename,
        mimeType: input.mimeType,
        extension: input.extension,
        size: input.size,
        checksum: input.checksum,
        width: input.width,
        height: input.height,
        createdAt: input.uploadedAt,
      },
    });
  }

  async findById(id: string): Promise<FileAsset> {
    const file = await prisma.fileAsset.findUnique({ where: { id } });

    if (!file) {
      throw new FileNotFoundError(id);
    }

    return file;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await prisma.fileAsset.delete({ where: { id } });
  }
}

export const fileAssetService = new PrismaFileAssetService();
