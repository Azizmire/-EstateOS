import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { metricsSnapshot } from '../services/metrics.service.js';

const router = Router();
router.use(requireAuth, requireRole(UserRole.ADMIN));

router.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true, role: true, createdAt: true,
        tenantProfile: { select: { id: true, firstName: true, lastName: true } },
        ownedProperties: { include: { property: { select: { id: true, name: true } } } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

const accessSchema = z.object({
  role: z.nativeEnum(UserRole),
  tenantId: z.string().cuid().nullable().optional(),
  propertyIds: z.array(z.string().cuid()).optional(),
}).superRefine((value, context) => {
  if (value.role === UserRole.TENANT && !value.tenantId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['tenantId'], message: 'A tenant profile is required for tenant access' });
  }
  if (value.role === UserRole.OWNER && !value.propertyIds?.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['propertyIds'], message: 'At least one property is required for owner access' });
  }
});

router.patch('/users/:id/access', async (req, res, next) => {
  try {
    const input = accessSchema.parse(req.body);
    if (req.params.id === req.user!.id && input.role !== UserRole.ADMIN) {
      return res.status(409).json({ message: 'You cannot remove your own administrator access' });
    }

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { id: req.params.id } });
      if (!existing) throw Object.assign(new Error('User not found'), { statusCode: 404 });

      await tx.tenant.updateMany({
        where: { userId: existing.id },
        data: { userId: null },
      });
      await tx.propertyOwner.deleteMany({ where: { userId: existing.id } });

      if (input.role === UserRole.TENANT && input.tenantId) {
        await tx.tenant.update({ where: { id: input.tenantId }, data: { userId: existing.id } });
      }
      if (input.role === UserRole.OWNER && input.propertyIds?.length) {
        await tx.propertyOwner.createMany({
          data: [...new Set(input.propertyIds)].map((propertyId) => ({
            userId: existing.id,
            propertyId,
          })),
        });
      }

      return tx.user.update({
        where: { id: existing.id },
        data: { role: input.role },
        select: { id: true, name: true, email: true, role: true },
      });
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.get('/audit', async (req, res, next) => {
  try {
    const take = Math.min(Number(req.query.limit) || 100, 250);
    const logs = await prisma.auditLog.findMany({
      take,
      where: typeof req.query.action === 'string'
        ? { action: { contains: req.query.action, mode: 'insensitive' } }
        : undefined,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

router.get('/metrics', (_req, res) => {
  res.json({ metrics: metricsSnapshot() });
});

export default router;
