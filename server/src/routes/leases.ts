import { LeaseStatus, UnitStatus } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const dateSchema = z.coerce.date();

const leaseSchema = z
  .object({
    unitId: z.string().cuid(),
    tenantIds: z.array(z.string().cuid()).min(1),
    primaryTenantId: z.string().cuid(),
    startDate: dateSchema,
    endDate: dateSchema,
    monthlyRent: z.coerce.number().positive(),
    securityDeposit: z.coerce.number().nonnegative(),
    status: z.nativeEnum(LeaseStatus).optional(),
    notes: z.string().trim().max(3000).optional().nullable(),
  })
  .refine((value) => value.endDate > value.startDate, {
    message: 'Lease end date must be after the start date',
    path: ['endDate'],
  })
  .refine((value) => value.tenantIds.includes(value.primaryTenantId), {
    message: 'Primary tenant must be included in tenantIds',
    path: ['primaryTenantId'],
  });

const updateLeaseSchema = z
  .object({
    unitId: z.string().cuid().optional(),
    tenantIds: z.array(z.string().cuid()).min(1).optional(),
    primaryTenantId: z.string().cuid().optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
    monthlyRent: z.coerce.number().positive().optional(),
    securityDeposit: z.coerce.number().nonnegative().optional(),
    status: z.nativeEnum(LeaseStatus).optional(),
    notes: z.string().trim().max(3000).optional().nullable(),
  })
  .refine(
    (value) => !value.tenantIds || !value.primaryTenantId || value.tenantIds.includes(value.primaryTenantId),
    { message: 'Primary tenant must be included in tenantIds', path: ['primaryTenantId'] },
  );

const leaseInclude = {
  unit: { include: { property: true } },
  tenants: { include: { tenant: true }, orderBy: { primary: 'desc' as const } },
  payments: { orderBy: { dueDate: 'desc' as const } },
};

router.get('/', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const parsedStatus = status ? z.nativeEnum(LeaseStatus).parse(status) : undefined;

    const leases = await prisma.lease.findMany({
      where: parsedStatus ? { status: parsedStatus } : undefined,
      include: leaseInclude,
      orderBy: { startDate: 'desc' },
    });

    res.json({ leases });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const lease = await prisma.lease.findUnique({
      where: { id: req.params.id },
      include: leaseInclude,
    });

    if (!lease) return res.status(404).json({ message: 'Lease not found' });
    res.json({ lease });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = leaseSchema.parse(req.body);
    const uniqueTenantIds = [...new Set(input.tenantIds)];

    const lease = await prisma.$transaction(async (tx) => {
      const unit = await tx.unit.findUnique({ where: { id: input.unitId } });
      if (!unit) throw Object.assign(new Error('Unit not found'), { statusCode: 404 });

      const overlappingLease = await tx.lease.findFirst({
        where: {
          unitId: input.unitId,
          status: { in: [LeaseStatus.ACTIVE, LeaseStatus.EXPIRING] },
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
        select: { id: true },
      });

      if (overlappingLease) {
        throw Object.assign(new Error('Unit already has an overlapping active lease'), { statusCode: 409 });
      }

      const tenants = await tx.tenant.count({ where: { id: { in: uniqueTenantIds } } });
      if (tenants !== uniqueTenantIds.length) {
        throw Object.assign(new Error('One or more tenants were not found'), { statusCode: 404 });
      }

      const created = await tx.lease.create({
        data: {
          unitId: input.unitId,
          startDate: input.startDate,
          endDate: input.endDate,
          monthlyRent: input.monthlyRent,
          securityDeposit: input.securityDeposit,
          status: input.status ?? LeaseStatus.DRAFT,
          notes: input.notes,
          tenants: {
            create: uniqueTenantIds.map((tenantId) => ({
              tenantId,
              primary: tenantId === input.primaryTenantId,
            })),
          },
        },
        include: leaseInclude,
      });

      if ([LeaseStatus.ACTIVE, LeaseStatus.EXPIRING].includes(created.status)) {
        await tx.unit.update({ where: { id: input.unitId }, data: { status: UnitStatus.OCCUPIED } });
      }

      return created;
    });

    res.status(201).json({ lease });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const input = updateLeaseSchema.parse(req.body);

    const lease = await prisma.$transaction(async (tx) => {
      const current = await tx.lease.findUnique({
        where: { id: req.params.id },
        include: { tenants: true },
      });
      if (!current) throw Object.assign(new Error('Lease not found'), { statusCode: 404 });

      const startDate = input.startDate ?? current.startDate;
      const endDate = input.endDate ?? current.endDate;
      if (endDate <= startDate) {
        throw Object.assign(new Error('Lease end date must be after the start date'), { statusCode: 400 });
      }

      const tenantIds = input.tenantIds ? [...new Set(input.tenantIds)] : current.tenants.map((item) => item.tenantId);
      const currentPrimary = current.tenants.find((item) => item.primary)?.tenantId;
      const primaryTenantId = input.primaryTenantId ?? currentPrimary ?? tenantIds[0];
      if (!tenantIds.includes(primaryTenantId)) {
        throw Object.assign(new Error('Primary tenant must be included in tenantIds'), { statusCode: 400 });
      }

      if (input.tenantIds) {
        const tenantCount = await tx.tenant.count({ where: { id: { in: tenantIds } } });
        if (tenantCount !== tenantIds.length) {
          throw Object.assign(new Error('One or more tenants were not found'), { statusCode: 404 });
        }
        await tx.leaseTenant.deleteMany({ where: { leaseId: current.id } });
        await tx.leaseTenant.createMany({
          data: tenantIds.map((tenantId) => ({ leaseId: current.id, tenantId, primary: tenantId === primaryTenantId })),
        });
      } else if (input.primaryTenantId) {
        await tx.leaseTenant.updateMany({ where: { leaseId: current.id }, data: { primary: false } });
        await tx.leaseTenant.update({
          where: { leaseId_tenantId: { leaseId: current.id, tenantId: primaryTenantId } },
          data: { primary: true },
        });
      }

      const updated = await tx.lease.update({
        where: { id: current.id },
        data: {
          unitId: input.unitId,
          startDate: input.startDate,
          endDate: input.endDate,
          monthlyRent: input.monthlyRent,
          securityDeposit: input.securityDeposit,
          status: input.status,
          notes: input.notes,
        },
        include: leaseInclude,
      });

      const isOccupying = [LeaseStatus.ACTIVE, LeaseStatus.EXPIRING].includes(updated.status);
      await tx.unit.update({
        where: { id: updated.unitId },
        data: { status: isOccupying ? UnitStatus.OCCUPIED : UnitStatus.VACANT },
      });

      if (current.unitId !== updated.unitId) {
        const otherActiveLease = await tx.lease.findFirst({
          where: {
            unitId: current.unitId,
            id: { not: current.id },
            status: { in: [LeaseStatus.ACTIVE, LeaseStatus.EXPIRING] },
          },
          select: { id: true },
        });
        if (!otherActiveLease) {
          await tx.unit.update({ where: { id: current.unitId }, data: { status: UnitStatus.VACANT } });
        }
      }

      return updated;
    });

    res.json({ lease });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.$transaction(async (tx) => {
      const lease = await tx.lease.findUnique({ where: { id: req.params.id } });
      if (!lease) throw Object.assign(new Error('Lease not found'), { statusCode: 404 });
      if ([LeaseStatus.ACTIVE, LeaseStatus.EXPIRING].includes(lease.status)) {
        throw Object.assign(new Error('Active leases must be ended or terminated before deletion'), { statusCode: 409 });
      }

      await tx.lease.delete({ where: { id: lease.id } });
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
