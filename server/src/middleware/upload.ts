import multer from 'multer';
import {
  ATTACHMENT_MIME_TYPES,
  DOCUMENT_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_DOCUMENT_SIZE,
  MAX_IMAGE_SIZE,
} from '../constants/upload.constants.js';
import { InvalidUploadError } from '../storage/storage-errors.js';

function createUpload(allowedMimeTypes: readonly string[], fileSize: number) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize, files: 1, fields: 5 },
    fileFilter: (_req, file, callback) => {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        callback(new InvalidUploadError(`Unsupported declared file type: ${file.mimetype}`));
        return;
      }
      callback(null, true);
    },
  });
}

export const imageUpload = createUpload(IMAGE_MIME_TYPES, MAX_IMAGE_SIZE);
export const documentUpload = createUpload(DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE);
export const attachmentUpload = createUpload(ATTACHMENT_MIME_TYPES, MAX_DOCUMENT_SIZE);
