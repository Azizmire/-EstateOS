import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { StorageProvider, PutObjectInput, StorageObject } from './provider.js';

export class LocalStorageProvider implements StorageProvider {
  private readonly root: string;

  constructor(root = path.resolve('uploads')) {
    this.root = path.resolve(root);
  }

  private resolve(key: string) {
    const target = path.resolve(this.root, key);
    if (target !== this.root && !target.startsWith(`${this.root}${path.sep}`)) {
      throw new Error('Invalid storage key');
    }
    return target;
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
