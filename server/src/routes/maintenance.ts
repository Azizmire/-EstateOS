import {
  MaintenancePriority,
  MaintenanceStatus,
  UserRole,
} from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
router.use(
  requireAuth,
  requireRole(UserRole.ADMIN, UserRole.MANAGER, UserRole.MAINTENANCE),
);
const ASSIGNABLE_ROLES: readonly UserRole[] = [
  UserRole.MAINTENANCE,
  UserRole.ADMIN,
  UserRole.MANAGER,
];
const DELETABLE_STATUSES: readonly MaintenanceStatus[] = [
  MaintenanceStatus.NEW,
  MaintenanceStatus.CANCELLED,
];

const maintenanceSchema = z.object({
  propertyId: z.string().cuid(),
  unitId: z.string().cuid().optional().nullable(),
  tenantId: z.string().cuid().optional().nullable(),
  assignedTechnicianId: z.string().cuid().optional().nullable(),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(5000),
  priority: z.nativeEnum(MaintenancePriority).optional(),
  status: z.nativeEnum(MaintenanceStatus).optional(),
  scheduledFor: z.coerce.date().optional().nullable(),
});

const updateMaintenanceSchema = maintenanceSchema.partial();

const updateEntrySchema = z.object({
  message: z.string().trim().min(1).max(3000),
  status: z.nativeEnum(MaintenanceStatus).optional(),
});

const maintenanceInclude = {
  property: true,
  unit: true,
  tenant: true,
  assignedTechnician: {
    select: { id: true, name: true, email: true, role: true },
  },
  updates: { orderBy: { createdAt: 'desc' as const } },
};

async function validateRelations(input: {
  propertyId: string;
  unitId?: string | null;
  tenantId?: string | null;
  assignedTechnicianId?: string | null;
}) {
  const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
  if (!property) throw Object.assign(new Error('Property not found'), { statusCode: 404 });

  if (input.unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: input.unitId } });
    if (!unit) throw Object.assign(new Error('Unit not found'), { statusCode: 404 });
    if (unit.propertyId !== input.propertyId) {
      throw Object.assign(new Error('Unit does not belong to the selected property'), { statusCode: 400 });
    }
  }

  if (input.tenantId) {
    const tenant = await prisma.tenant.findUnique({ where: { id: input.tenantId } });
    if (!tenant) throw Object.assign(new Error('Tenant not found'), { statusCode: 404 });
  }

  if (input.assignedTechnicianId) {
    const technician = await prisma.user.findUnique({ where: { id: input.assignedTechnicianId } });
    if (!technician) throw Object.assign(new Error('Assigned technician not found'), { statusCode: 404 });
    if (!ASSIGNABLE_ROLES.includes(technician.role)) {
      throw Object.assign(new Error('Selected user cannot be assigned maintenance work'), { statusCode: 400 });
    }
  }
}

router.get('/', async (req, res, next) => {
  try {
    const status = typeof req.query.status === 'string'
      ? z.nativeEnum(MaintenanceStatus).parse(req.query.status)
      : undefined;
    const priority = typeof req.query.priority === 'string'
      ? z.nativeEnum(MaintenancePriority).parse(req.query.priority)
      : undefined;
    const propertyId = typeof req.query.propertyId === 'string' ? req.query.propertyId : undefined;
    const assignedTechnicianId = typeof req.query.assignedTechnicianId === 'string'
      ? req.query.assignedTechnicianId
      : undefined;

    const requests = await prisma.maintenanceRequest.findMany({
      where: { status, priority, propertyId, assignedTechnicianId },
      include: maintenanceInclude,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ requests });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (_req, res, next) => {
  try {
    const [open, urgent, completed, unassigned] = await Promise.all([
      prisma.maintenanceRequest.count({
        where: { status: { in: [MaintenanceStatus.NEW, MaintenanceStatus.ASSIGNED, MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.WAITING_PARTS] } },
      }),
      prisma.maintenanceRequest.count({
        where: {
          priority: MaintenancePriority.URGENT,
          status: { notIn: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] },
        },
      }),
      prisma.maintenanceRequest.count({ where: { status: MaintenanceStatus.COMPLETED } }),
      prisma.maintenanceRequest.count({
        where: {
          assignedTechnicianId: null,
          status: { notIn: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED] },
        },
      }),
    ]);

    res.json({ summary: { open, urgent, completed, unassigned } });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: req.params.id },
      include: maintenanceInclude,
    });

    if (!request) return res.status(404).json({ message: 'Maintenance request not found' });
    res.json({ request });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = maintenanceSchema.parse(req.body);
    await validateRelations(input);

    const status = input.status
      ?? (input.assignedTechnicianId ? MaintenanceStatus.ASSIGNED : MaintenanceStatus.NEW);

    const request = await prisma.maintenanceRequest.create({
      data: {
        ...input,
        priority: input.priority ?? MaintenancePriority.NORMAL,
        status,
        completedAt: status === MaintenanceStatus.COMPLETED ? new Date() : null,
      },
      include: maintenanceInclude,
    });

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const input = updateMaintenanceSchema.parse(req.body);
    const current = await prisma.maintenanceRequest.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Maintenance request not found' });

    await validateRelations({
      propertyId: input.propertyId ?? current.propertyId,
      unitId: input.unitId === undefined ? current.unitId : input.unitId,
      tenantId: input.tenantId === undefined ? current.tenantId : input.tenantId,
      assignedTechnicianId: input.assignedTechnicianId === undefined
        ? current.assignedTechnicianId
        : input.assignedTechnicianId,
    });

    const nextStatus = input.status ?? current.status;
    const request = await prisma.maintenanceRequest.update({
      where: { id: current.id },
      data: {
        ...input,
        completedAt: nextStatus === MaintenanceStatus.COMPLETED
          ? current.completedAt ?? new Date()
          : null,
      },
      include: maintenanceInclude,
    });

    res.json({ request });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/updates', async (req, res, next) => {
  try {
    const input = updateEntrySchema.parse(req.body);

    const request = await prisma.$transaction(async (tx) => {
      const current = await tx.maintenanceRequest.findUnique({ where: { id: req.params.id } });
      if (!current) throw Object.assign(new Error('Maintenance request not found'), { statusCode: 404 });

      await tx.maintenanceUpdate.create({
        data: {
          requestId: current.id,
          message: input.message,
          status: input.status,
        },
      });

      if (input.status) {
        await tx.maintenanceRequest.update({
          where: { id: current.id },
          data: {
            status: input.status,
            completedAt: input.status === MaintenanceStatus.COMPLETED
              ? current.completedAt ?? new Date()
              : null,
          },
        });
      }

      return tx.maintenanceRequest.findUniqueOrThrow({
        where: { id: current.id },
        include: maintenanceInclude,
      });
    });

    res.status(201).json({ request });
  } catch (error) {
    next(error);
  }
});

router.delete(
  '/:id',
  requireRole(UserRole.ADMIN, UserRole.MANAGER),
  async (req, res, next) => {
    try {
      const id = String(req.params.id);
      const request = await prisma.maintenanceRequest.findUnique({ where: { id } });
      if (!request) return res.status(404).json({ message: 'Maintenance request not found' });

      if (!DELETABLE_STATUSES.includes(request.status)) {
        return res.status(409).json({
          message: 'Only new or cancelled maintenance requests can be deleted',
        });
      }

      await prisma.maintenanceRequest.delete({ where: { id: request.id } });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

export default router;
