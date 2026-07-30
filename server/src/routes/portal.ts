import { LeaseStatus, MaintenancePriority, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

async function tenantForUser(userId: string) {
  return prisma.tenant.findFirst({
    where: { userId },
    include: {
      leases: {
        include: { lease: { include: { unit: { include: { property: true } }, documents: { include: { file: true } } } } },
        orderBy: { lease: { startDate: 'desc' } },
      },
      payments: { orderBy: { dueDate: 'desc' } },
      maintenance: {
        include: { property: true, unit: true, updates: { orderBy: { createdAt: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

router.get('/tenant', requireRole(UserRole.TENANT), async (req, res, next) => {
  try {
    const tenant = await tenantForUser(req.user!.id);
    if (!tenant) return res.status(404).json({ message: 'Tenant profile is not linked to this account' });
    res.json({ tenant });
  } catch (error) {
    next(error);
  }
});

router.post('/tenant/maintenance', requireRole(UserRole.TENANT), async (req, res, next) => {
  try {
    const input = z.object({
      unitId: z.string().cuid(),
      title: z.string().trim().min(3).max(160),
      description: z.string().trim().min(10).max(5000),
      priority: z.nativeEnum(MaintenancePriority).default(MaintenancePriority.NORMAL),
    }).parse(req.body);
    const tenant = await prisma.tenant.findFirst({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!tenant) return res.status(404).json({ message: 'Tenant profile is not linked to this account' });

    const lease = await prisma.lease.findFirst({
      where: {
        unitId: input.unitId,
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.EXPIRING] },
        tenants: { some: { tenantId: tenant.id } },
      },
      include: { unit: true },
    });
    if (!lease) return res.status(403).json({ message: 'You can only request service for your active unit' });

    const request = await prisma.maintenanceRequest.create({
      data: {
        propertyId: lease.unit.propertyId,
        unitId: lease.unitId,
        tenantId: tenant.id,
        title: input.title,
        description: input.description,
        priority: input.priority,
      },
      include: { property: true, unit: true },
    });
    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
});

router.get('/owner', requireRole(UserRole.OWNER), async (req, res, next) => {
  try {
    const now = new Date();
    const from = typeof req.query.from === 'string'
      ? z.coerce.date().parse(req.query.from)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const to = typeof req.query.to === 'string' ? z.coerce.date().parse(req.query.to) : now;
    if (from > to) return res.status(400).json({ message: 'from must be before or equal to to' });
    const ownerships = await prisma.propertyOwner.findMany({
      where: { userId: req.user!.id },
      include: {
        property: {
          include: {
            units: {
              include: {
                leases: {
                  where: { status: { in: [LeaseStatus.ACTIVE, LeaseStatus.EXPIRING] } },
                  include: { payments: { where: { paidAt: { gte: from, lte: to } } } },
                },
              },
            },
            expenses: { where: { incurredAt: { gte: from, lte: to } }, orderBy: { incurredAt: 'desc' } },
            maintenance: { orderBy: { createdAt: 'desc' } },
          },
        },
      },
    });

    const properties = ownerships.map(({ property }) => {
      const leases = property.units.flatMap((unit) => unit.leases);
      const payments = leases.flatMap((lease) => lease.payments);
      const revenue = payments.filter((payment) => payment.status === 'PAID')
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      const expenses = property.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
      return {
        ...property,
        performance: {
          occupiedUnits: property.units.filter((unit) => unit.status === 'OCCUPIED').length,
          revenue,
          expenses,
          netOperatingIncome: revenue - expenses,
          openMaintenance: property.maintenance.filter((item) => !['COMPLETED', 'CANCELLED'].includes(item.status)).length,
        },
      };
    });
    res.json({ period: { from, to }, properties });
  } catch (error) {
    next(error);
  }
});

export default router;
