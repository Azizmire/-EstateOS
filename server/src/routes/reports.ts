import {
  LeaseStatus,
  MaintenanceStatus,
  PaymentStatus,
  UnitStatus,
  UserRole,
} from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { buildMonthlyFinancialReport } from '../services/reporting.service.js';

const router = Router();
router.use(requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER));

const rangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine((value) => !value.from || !value.to || value.from <= value.to, {
  message: 'from must be before or equal to to',
});

router.get('/financial', async (req, res, next) => {
  try {
    const input = rangeSchema.parse(req.query);
    const now = new Date();
    const from = input.from ?? new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const to = input.to ?? now;
    const maximumRange = new Date(from);
    maximumRange.setUTCFullYear(maximumRange.getUTCFullYear() + 5);
    if (to > maximumRange) {
      return res.status(400).json({ message: 'Report range cannot exceed five years' });
    }

    const [payments, expenses] = await Promise.all([
      prisma.payment.findMany({
        where: { status: PaymentStatus.PAID, paidAt: { gte: from, lte: to } },
        select: { amount: true, paidAt: true },
      }),
      prisma.expense.findMany({
        where: { incurredAt: { gte: from, lte: to } },
        select: { amount: true, incurredAt: true },
      }),
    ]);

    res.json({ report: buildMonthlyFinancialReport(payments, expenses, from, to) });
  } catch (error) {
    next(error);
  }
});

router.get('/portfolio', async (_req, res, next) => {
  try {
    const [properties, units, leases, maintenance] = await Promise.all([
      prisma.property.count(),
      prisma.unit.groupBy({ by: ['status'], _count: true }),
      prisma.lease.groupBy({ by: ['status'], _count: true }),
      prisma.maintenanceRequest.groupBy({ by: ['status'], _count: true }),
    ]);

    const counts = <T extends string>(
      rows: Array<{ status: T; _count: number }>,
      values: readonly T[],
    ) => Object.fromEntries(values.map((status) => [
      status,
      rows.find((row) => row.status === status)?._count ?? 0,
    ]));

    res.json({
      report: {
        generatedAt: new Date(),
        properties,
        units: counts(units, Object.values(UnitStatus)),
        leases: counts(leases, Object.values(LeaseStatus)),
        maintenance: counts(maintenance, Object.values(MaintenanceStatus)),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
