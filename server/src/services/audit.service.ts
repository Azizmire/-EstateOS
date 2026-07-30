import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export type AuditEvent = {
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
};

export interface AuditService {
  record(event: AuditEvent): Promise<void>;
}

export class PrismaAuditService implements AuditService {
  async record(event: AuditEvent): Promise<void> {
    await prisma.auditLog.create({
      data: {
        actorId: event.actorId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: event.metadata,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      },
    });
  }
}

export const auditService = new PrismaAuditService();
