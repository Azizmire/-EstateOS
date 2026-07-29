import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) {
    return res.status(400).json({ message: 'Validation failed', issues: error.flatten() });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'A record with that value already exists' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Record not found' });
    }
  }

  console.error(error);
  return res.status(500).json({ message: 'Internal server error' });
}
