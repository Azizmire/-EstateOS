export type UploadFileInput = {
  buffer: Buffer;
  filename: string;
  uploadedById: string;
  targetId: string;
  label?: string;
};
