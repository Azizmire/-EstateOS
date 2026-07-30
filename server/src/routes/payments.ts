import { PaymentStatus, PaymentType, UserRole } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { paginationResult, parsePagination } from '../utils/pagination.js';

const router = Router();
router.use(requireAuth, requireRole(UserRole.ADMIN, UserRole.MANAGER));

const paymentSchema = z.object({
  tenantId: z.string().cuid(),
  leaseId: z.string().cuid(),
  amount: z.coerce.number().positive(),
  type: z.nativeEnum(PaymentType).optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  dueDate: z.coerce.date(),
  paidAt: z.coerce.date().optional().nullable(),
  reference: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

const updatePaymentSchema = paymentSchema.partial();

const paymentInclude = {
  tenant: true,
  lease: {
    include: {
      unit: { include: { property: true } },
      tenants: { include: { tenant: true } },
    },
  },
};

router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const status = typeof req.query.status === 'string'
      ? z.nativeEnum(PaymentStatus).parse(req.query.status)
      : undefined;
    const type = typeof req.query.type === 'string'
      ? z.nativeEnum(PaymentType).parse(req.query.type)
      : undefined;
    const tenantId = typeof req.query.tenantId === 'string' ? req.query.tenantId : undefined;
    const leaseId = typeof req.query.leaseId === 'string' ? req.query.leaseId : undefined;

    const payments = await prisma.payment.findMany({
      skip, take,
      where: { status, type, tenantId, leaseId },
      include: paymentInclude,
      orderBy: [{ dueDate: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ payments, pagination: paginationResult(payments.length, page, pageSize) });
  } catch (error) {
    next(error);
  }
});

router.get('/summary', async (_req, res, next) => {
  try {
    const now = new Date();

    await prisma.payment.updateMany({
      where: {
        dueDate: { lt: now },
        status: PaymentStatus.PENDING,
      },
      data: { status: PaymentStatus.LATE },
    });

    const [paid, pending, late, failed] = await Promise.all([
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PENDING },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.LATE },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.aggregate({
        where: { status: PaymentStatus.FAILED },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    res.json({
      summary: {
        paid: { count: paid._count, amount: paid._sum.amount ?? 0 },
        pending: { count: pending._count, amount: pending._sum.amount ?? 0 },
        late: { count: late._count, amount: late._sum.amount ?? 0 },
        failed: { count: failed._count, amount: failed._sum.amount ?? 0 },
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: paymentInclude,
    });

    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    res.json({ payment });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const input = paymentSchema.parse(req.body);

    const payment = await prisma.$transaction(async (tx) => {
      const lease = await tx.lease.findUnique({
        where: { id: input.leaseId },
        include: { tenants: true },
      });

      if (!lease) throw Object.assign(new Error('Lease not found'), { statusCode: 404 });
      if (!lease.tenants.some((item) => item.tenantId === input.tenantId)) {
        throw Object.assign(new Error('Tenant is not attached to this lease'), { statusCode: 400 });
      }

      const status = input.status ?? PaymentStatus.PENDING;
      const paidAt = status === PaymentStatus.PAID ? input.paidAt ?? new Date() : input.paidAt;

      return tx.payment.create({
        data: {
          tenantId: input.tenantId,
          leaseId: input.leaseId,
          amount: input.amount,
          type: input.type ?? PaymentType.RENT,
          status,
          dueDate: input.dueDate,
          paidAt,
          reference: input.reference,
          notes: input.notes,
        },
        include: paymentInclude,
      });
    });

    res.status(201).json({ payment });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const input = updatePaymentSchema.parse(req.body);

    const payment = await prisma.$transaction(async (tx) => {
      const current = await tx.payment.findUnique({ where: { id: req.params.id } });
      if (!current) throw Object.assign(new Error('Payment not found'), { statusCode: 404 });

      const leaseId = input.leaseId ?? current.leaseId;
      const tenantId = input.tenantId ?? current.tenantId;

      if (input.leaseId || input.tenantId) {
        const lease = await tx.lease.findUnique({
          where: { id: leaseId },
          include: { tenants: true },
        });

        if (!lease) throw Object.assign(new Error('Lease not found'), { statusCode: 404 });
        if (!lease.tenants.some((item) => item.tenantId === tenantId)) {
          throw Object.assign(new Error('Tenant is not attached to this lease'), { statusCode: 400 });
        }
      }

      const nextStatus = input.status ?? current.status;
      const paidAt = nextStatus === PaymentStatus.PAID
        ? input.paidAt ?? current.paidAt ?? new Date()
        : input.paidAt === undefined
          ? null
          : input.paidAt;

      return tx.payment.update({
        where: { id: current.id },
        data: {
          tenantId: input.tenantId,
          leaseId: input.leaseId,
          amount: input.amount,
          type: input.type,
          status: input.status,
          dueDate: input.dueDate,
          paidAt,
          reference: input.reference,
          notes: input.notes,
        },
        include: paymentInclude,
      });
    });

    res.json({ payment });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/mark-paid', async (req, res, next) => {
  try {
    const body = z.object({
      paidAt: z.coerce.date().optional(),
      reference: z.string().trim().max(120).optional().nullable(),
    }).parse(req.body ?? {});

    const payment = await prisma.payment.update({
      where: { id: req.params.id },
      data: {
        status: PaymentStatus.PAID,
        paidAt: body.paidAt ?? new Date(),
        reference: body.reference,
      },
      include: paymentInclude,
    });

    res.json({ payment });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (payment.status === PaymentStatus.PAID) {
      return res.status(409).json({ message: 'Paid transactions should be refunded instead of deleted' });
    }

    await prisma.payment.delete({ where: { id: payment.id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
