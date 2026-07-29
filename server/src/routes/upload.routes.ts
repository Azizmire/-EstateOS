import type { Request } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import { UploadController } from '../controllers/upload.controller.js';
import type { UploadControllerDependencies } from '../controllers/upload.controller.dependencies.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { attachmentUpload, documentUpload, imageUpload } from '../middleware/upload.js';
import { InvalidUploadError } from '../storage/storage-errors.js';
import { sanitizeFilename } from '../utils/file-names.js';

const propertyFields = z.object({
  propertyId: z.string().min(1),
  altText: z.string().trim().max(300).optional(),
});
const leaseFields = z.object({
  leaseId: z.string().min(1),
  title: z.string().trim().max(200).optional(),
});
const maintenanceFields = z.object({
  requestId: z.string().min(1),
  caption: z.string().trim().max(500).optional(),
});

function fileInput(req: Request, targetId: string, label?: string) {
  if (!req.file) throw new InvalidUploadError('A multipart file field named "file" is required.');

  return {
    buffer: req.file.buffer,
    filename: sanitizeFilename(req.file.originalname),
    uploadedById: req.user!.id,
    targetId,
    label,
  };
}

export function createUploadRouter(dependencies: UploadControllerDependencies) {
  const router = Router();
  const controller = new UploadController(dependencies);

  router.use(requireAuth);

  router.post(
    '/property-image',
    requireRole('ADMIN', 'MANAGER'),
    imageUpload.single('file'),
    async (req, res, next) => {
      try {
        const input = propertyFields.parse(req.body);
        const file = await controller.uploadPropertyImage(
          fileInput(req, input.propertyId, input.altText),
        );
        res.status(201).json({ file });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/lease-document',
    requireRole('ADMIN', 'MANAGER'),
    documentUpload.single('file'),
    async (req, res, next) => {
      try {
        const input = leaseFields.parse(req.body);
        const file = await controller.uploadLeaseDocument(
          fileInput(req, input.leaseId, input.title),
        );
        res.status(201).json({ file });
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    '/maintenance-attachment',
    requireRole('ADMIN', 'MANAGER', 'MAINTENANCE'),
    attachmentUpload.single('file'),
    async (req, res, next) => {
      try {
        const input = maintenanceFields.parse(req.body);
        const file = await controller.uploadMaintenanceAttachment(
          fileInput(req, input.requestId, input.caption),
        );
        res.status(201).json({ file });
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
