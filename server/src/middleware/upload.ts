import multer from 'multer';

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024;

const imageTypes = ['image/jpeg','image/png','image/webp'];
const documentTypes = ['application/pdf'];

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE },
  fileFilter: (_req, file, cb) => {
    cb(null, imageTypes.includes(file.mimetype));
  }
});

export const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOCUMENT_SIZE },
  fileFilter: (_req, file, cb) => {
    cb(null, documentTypes.includes(file.mimetype));
  }
});
