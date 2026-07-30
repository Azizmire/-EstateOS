export interface StoredFileMetadata {
  key: string;
  filename: string;
  mimeType: string;
  extension: string;
  size: number;
  checksum?: string;
  width?: number;
  height?: number;
  uploadedAt: Date;
}
