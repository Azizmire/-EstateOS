import { UserRole } from '@prisma/client';
import { Router, type Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createRefreshToken, hashPassword, hashRefreshToken, signToken, verifyPassword } from '../lib/auth.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  role: z.nativeEnum(UserRole).default(UserRole.MANAGER),
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

const refreshSchema = z.object({ refreshToken: z.string().min(32) });
const REFRESH_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

async function createSession(user: { id: string; role: UserRole }, req: Request) {
  const refreshToken = createRefreshToken();
  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_LIFETIME_MS),
      userAgent: req.get('user-agent')?.slice(0, 500),
      ipAddress: req.ip,
    },
  });
  return { token: signToken({ id: user.id, role: user.role }), refreshToken, expiresIn: 900 };
}

router.post('/bootstrap', async (req, res, next) => {
  try {
    const input = registerSchema.omit({ role: true }).parse(req.body);
    const userCount = await prisma.user.count();

    if (userCount > 0) {
      return res.status(409).json({ message: 'EstateOS has already been initialized' });
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: UserRole.ADMIN,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.status(201).json({ user, ...(await createSession(user, req)) });
  } catch (error) {
    next(error);
  }
});

router.post('/register', requireAuth, requireRole(UserRole.ADMIN), async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });

    if (existing) {
      return res.status(409).json({ message: 'An account with that email already exists' });
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: input.role,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.status(201).json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt },
      ...(await createSession(user, req)),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokenHash = hashRefreshToken(refreshToken);
    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, name: true, email: true, role: true, createdAt: true } } },
    });
    if (!session || session.revokedAt || session.rotatedAt || session.expiresAt <= new Date()) {
      return res.status(401).json({ message: 'Refresh session is invalid or expired' });
    }

    const nextRefreshToken = createRefreshToken();
    await prisma.$transaction(async (tx) => {
      const rotated = await tx.refreshSession.updateMany({
        where: { id: session.id, rotatedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
        data: { rotatedAt: new Date() },
      });
      if (rotated.count !== 1) {
        throw Object.assign(new Error('Refresh session has already been used'), { statusCode: 401 });
      }
      await tx.refreshSession.create({
        data: {
          userId: session.userId,
          tokenHash: hashRefreshToken(nextRefreshToken),
          expiresAt: new Date(Date.now() + REFRESH_LIFETIME_MS),
          userAgent: req.get('user-agent')?.slice(0, 500),
          ipAddress: req.ip,
        },
      });
    });
    res.json({
      user: session.user,
      token: signToken({ id: session.user.id, role: session.user.role }),
      refreshToken: nextRefreshToken,
      expiresIn: 900,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await prisma.refreshSession.updateMany({
      where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, name: true, email: true, role: true, createdAt: true, updatedAt: true },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({ user });
  } catch (error) {
    next(error);
  }
});

router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const input = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(12).max(128),
    }).refine((value) => value.currentPassword !== value.newPassword, {
      message: 'New password must be different from the current password',
      path: ['newPassword'],
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user || !(await verifyPassword(input.currentPassword, user.passwordHash))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(input.newPassword) },
      }),
      prisma.refreshSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
