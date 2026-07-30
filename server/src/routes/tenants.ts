import { UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { paginationResult, parsePagination } from '../utils/pagination.js';

const router = Router();
router.use(requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER));

const tenantSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(30).optional().nullable(),
  emergencyName: z.string().trim().max(160).optional().nullable(),
  emergencyPhone: z.string().trim().max(30).optional().nullable(),
  notes: z.string().trim().max(3000).optional().nullable(),
});

router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const tenants = await prisma.tenant.findMany({
      skip, take,
      where: query
        ? {
            OR: [
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
              { phone: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        leases: {
          include: {
            lease: {
              include: { unit: { include: { property: true } } },
            },
          },
          orderBy: { lease: { startDate: 'desc' } },
        },
        _count: { select: { payments: true, maintenance: true } },
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    res.json({ tenants, pagination: paginationResult(tenants.length, page, pageSize) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        leases: {
          include: {
            lease: {
              include: { unit: { include: { property: true } } },
            },
          },
          orderBy: { lease: { startDate: 'desc' } },
        },
        payments: { orderBy: { dueDate: 'desc' } },
        maintenance: {
          include: { property: true, unit: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
    res.json({ tenant });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = tenantSchema.parse(req.body);
    const tenant = await prisma.tenant.create({ data: input });
    res.status(201).json({ tenant });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const input = tenantSchema.partial().parse(req.body);
    const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: input });
    res.json({ tenant });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const activeLease = await prisma.leaseTenant.findFirst({
      where: {
        tenantId: req.params.id,
        lease: { status: { in: ['ACTIVE', 'EXPIRING'] } },
      },
      select: { tenantId: true },
    });

    if (activeLease) {
      return res.status(409).json({ message: 'Tenant cannot be deleted while attached to an active lease' });
    }

    await prisma.tenant.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
