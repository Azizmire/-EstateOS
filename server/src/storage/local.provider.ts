import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { StorageProvider, PutObjectInput, StorageObject } from './provider.js';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly root = path.resolve('uploads')) {}

  private resolve(key: string) {
    return path.join(this.root, key);
  }

  async putObject(input: PutObjectInput): Promise<StorageObject> {
    const target = this.resolve(input.key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.data);
    return { key: input.key, size: input.data.length, mimeType: input.mimeType };
  }

  async getObject(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  async deleteObject(key: string): Promise<void> {
    await rm(this.resolve(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}
