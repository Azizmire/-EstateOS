import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { paginationResult, parsePagination } from '../utils/pagination.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { page, pageSize, skip, take } = parsePagination(req.query);
    const unreadOnly = z.enum(['true', 'false'])
      .optional()
      .transform((value) => value === 'true')
      .parse(typeof req.query.unread === 'string' ? req.query.unread : undefined);
    const notifications = await prisma.notification.findMany({
      skip, take,
      where: {
        userId: req.user!.id,
        readAt: unreadOnly ? null : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    });
    res.json({ notifications, unreadCount, pagination: paginationResult(notifications.length, page, pageSize) });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/read', async (req, res, next) => {
  try {
    const notification = await prisma.notification.update({
      where: {
        id: String(req.params.id),
        userId: req.user!.id,
      },
      data: { readAt: new Date() },
    });
    res.json({ notification });
  } catch (error) {
    next(error);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ updated: result.count });
  } catch (error) {
    next(error);
  }
});

export default router;
