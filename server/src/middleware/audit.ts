import type { NextFunction, Request, Response } from 'express';
import type { AuditService } from '../services/audit.service.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function createAuditMiddleware(auditService: AuditService) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    res.on('finish', () => {
      if (!req.user || res.statusCode >= 500) return;

      const entityId = typeof req.params.id === 'string' ? req.params.id : undefined;
      void auditService.record({
        actorId: req.user.id,
        action: `${req.method} ${req.baseUrl}${req.route?.path ?? req.path}`,
        entityType: req.baseUrl.split('/').filter(Boolean).at(-1) ?? 'api',
        entityId,
        metadata: { statusCode: res.statusCode },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }).catch((error: unknown) => {
        console.error('Failed to persist audit event', error);
      });
    });

    next();
  };
}
