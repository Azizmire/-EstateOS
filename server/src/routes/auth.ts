import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, signToken, verifyPassword } from '../lib/auth.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

router.post('/register', async (req, res, next) => {
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
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return res.status(201).json({ user, token: signToken({ id: user.id, role: user.role }) });
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
      token: signToken({ id: user.id, role: user.role }),
    });
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

export default router;
