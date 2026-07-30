import type { NextFunction, Request, Response } from 'express';
import type { AuditService } from '../services/audit.service.js';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function createAuditMiddleware(auditService: AuditService) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    const originalEnd = res.end.bind(res);
    let ending = false;
    res.end = ((chunk?: unknown, encoding?: BufferEncoding, callback?: () => void) => {
      if (ending || !req.user || res.statusCode >= 500) {
        return originalEnd(chunk as never, encoding as never, callback);
      }
      ending = true;
      const entityId = typeof req.params.id === 'string' ? req.params.id : undefined;
      void auditService.record({
        actorId: req.user.id,
        action: `${req.method} ${req.baseUrl}${req.route?.path ?? req.path}`,
        entityType: req.baseUrl.split('/').filter(Boolean).at(-1) ?? 'api',
        entityId,
        metadata: { statusCode: res.statusCode },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      }).then(() => {
        originalEnd(chunk as never, encoding as never, callback);
      }).catch((error: unknown) => {
        console.error('Failed to persist audit event', error);
        if (!res.headersSent) {
          res.statusCode = 503;
          res.setHeader('content-type', 'application/json; charset=utf-8');
          originalEnd(JSON.stringify({ message: 'The operation completed but its audit record could not be persisted. Verify state before retrying.' }));
        } else {
          originalEnd(chunk as never, encoding as never, callback);
        }
      });
      return res;
    }) as Response['end'];

    next();
  };
}
