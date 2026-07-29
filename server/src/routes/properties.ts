import { Router } from 'express';
import { UnitStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const propertySchema = z.object({
  name: z.string().trim().min(2).max(120),
  address1: z.string().trim().min(3).max(160),
  address2: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().min(2).max(100),
  state: z.string().trim().min(2).max(50),
  postalCode: z.string().trim().min(3).max(20),
  description: z.string().trim().max(2000).optional().nullable(),
});

const unitSchema = z.object({
  number: z.string().trim().min(1).max(30),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().min(0).max(20),
  squareFeet: z.coerce.number().int().positive().optional().nullable(),
  marketRent: z.coerce.number().nonnegative(),
  status: z.nativeEnum(UnitStatus).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const properties = await prisma.property.findMany({
      where: query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { address1: { contains: query, mode: 'insensitive' } },
              { city: { contains: query, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        units: { orderBy: { number: 'asc' } },
        _count: { select: { maintenance: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ properties });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const property = await prisma.property.findUnique({
      where: { id: req.params.id },
      include: {
        units: {
          include: {
            leases: {
              include: { tenants: { include: { tenant: true } } },
              orderBy: { startDate: 'desc' },
            },
          },
          orderBy: { number: 'asc' },
        },
        maintenance: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });

    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json({ property });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = propertySchema.parse(req.body);
    const property = await prisma.property.create({ data: input });
    res.status(201).json({ property });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const input = propertySchema.partial().parse(req.body);
    const property = await prisma.property.update({
      where: { id: req.params.id },
      data: input,
    });
    res.json({ property });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.property.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post('/:propertyId/units', async (req, res, next) => {
  try {
    const input = unitSchema.parse(req.body);
    const unit = await prisma.unit.create({
      data: { ...input, propertyId: req.params.propertyId },
    });
    res.status(201).json({ unit });
  } catch (error) {
    next(error);
  }
});

router.patch('/:propertyId/units/:unitId', async (req, res, next) => {
  try {
    const input = unitSchema.partial().parse(req.body);
    const unit = await prisma.unit.update({
      where: { id: req.params.unitId, propertyId: req.params.propertyId },
      data: input,
    });
    res.json({ unit });
  } catch (error) {
    next(error);
  }
});

router.delete('/:propertyId/units/:unitId', async (req, res, next) => {
  try {
    const unit = await prisma.unit.findFirst({
      where: { id: req.params.unitId, propertyId: req.params.propertyId },
      select: { id: true },
    });

    if (!unit) return res.status(404).json({ message: 'Unit not found' });
    await prisma.unit.delete({ where: { id: unit.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
