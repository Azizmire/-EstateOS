export type StorageObject = {
  key: string;
  size: number;
  mimeType: string;
  etag?: string;
};

export type PutObjectInput = {
  key: string;
  data: Buffer;
  mimeType: string;
};

export interface StorageProvider {
  putObject(input: PutObjectInput): Promise<StorageObject>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
