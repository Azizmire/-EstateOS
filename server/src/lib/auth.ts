import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env.js';

export type AuthTokenPayload = {
  id: string;
  role: UserRole;
};

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);
export const signToken = (payload: AuthTokenPayload) => jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
export const verifyToken = (token: string) => jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
