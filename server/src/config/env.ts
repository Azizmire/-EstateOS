import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  UPLOAD_DIR: z.string().min(1).default('uploads'),
  REDIS_URL: z.string().url().optional(),
  CLAMAV_HOST: z.string().min(1).optional(),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),
}).superRefine((value, context) => {
  if (value.NODE_ENV === 'production' && !value.REDIS_URL) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['REDIS_URL'], message: 'REDIS_URL is required in production' });
  }
  if (value.NODE_ENV === 'production' && !value.CLAMAV_HOST) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['CLAMAV_HOST'], message: 'CLAMAV_HOST is required in production' });
  }
});

export const env = envSchema.parse(process.env);
