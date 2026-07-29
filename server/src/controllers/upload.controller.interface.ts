import type { Request, Response, NextFunction } from 'express';

export interface UploadController {
  uploadPropertyImage(req: Request, res: Response, next: NextFunction): Promise<void>;
  uploadLeaseDocument(req: Request, res: Response, next: NextFunction): Promise<void>;
  uploadMaintenanceAttachment(req: Request, res: Response, next: NextFunction): Promise<void>;
}
