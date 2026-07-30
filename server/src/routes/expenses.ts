import { ExpenseCategory, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { paginationResult, parsePagination } from '../utils/pagination.js';

const router = Router();
router.use(requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER));

const expenseSchema = z.object({
  propertyId: z.string().cuid().optional().nullable(),
  category: z.nativeEnum(ExpenseCategory).default(ExpenseCategory.OTHER),
  amount: z.coerce.number().positive(),
  incurredAt: z.coerce.date(),
  vendor: z.string().trim().max(160).optional().nullable(),
  description: z.string().trim().min(2).max(2000),
  reference: z.string().trim().max(120).optional().nullable(),
});

router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const category = typeof req.query.category === 'string'
      ? z.nativeEnum(ExpenseCategory).parse(req.query.category)
      : undefined;
    const propertyId = typeof req.query.propertyId === 'string'
      ? req.query.propertyId
      : undefined;
    const expenses = await prisma.expense.findMany({
      skip, take,
      where: { category, propertyId },
      include: { property: true },
      orderBy: [{ incurredAt: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ expenses, pagination: paginationResult(expenses.length, page, pageSize) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const expense = await prisma.expense.findUnique({
      where: { id: String(req.params.id) },
      include: { property: true },
    });
    if (!expense) return res.status(404).json({ message: 'Expense not found' });
    res.json({ expense });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = expenseSchema.parse(req.body);
    const expense = await prisma.expense.create({
      data: input,
      include: { property: true },
    });
    res.status(201).json({ expense });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const input = expenseSchema.partial().parse(req.body);
    const expense = await prisma.expense.update({
      where: { id: String(req.params.id) },
      data: input,
      include: { property: true },
    });
    res.json({ expense });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.expense.delete({ where: { id: String(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
