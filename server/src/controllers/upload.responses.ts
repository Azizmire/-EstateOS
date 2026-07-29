export interface UploadedFileResponse {
  id: string;
  key: string;
  url?: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  uploadedAt: Date;
}

export interface UploadErrorResponse {
  error: string;
  message: string;
}
