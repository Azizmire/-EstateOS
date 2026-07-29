import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { InvalidUploadError } from '../storage/storage-errors.js';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Validation failed', issues: error.flatten() });
  }

  if (error instanceof InvalidUploadError) {
    return res.status(400).json({ message: error.message });
  }

  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({ message: error.message, code: error.code });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A record with that value already exists' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ message: 'A referenced record does not exist' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Record not found' });
    }
  }

  console.error(error);
  return res.status(500).json({ message: 'Internal server error' });
}
