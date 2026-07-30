import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { startPortfolioJobScheduler } from './jobs/scheduler.js';
import { prisma } from './lib/prisma.js';
import { connectRedis, disconnectRedis } from './lib/redis.js';

const server = createServer(app);

let stopScheduler: (() => void) | undefined;
let shuttingDown = false;

async function start() {
  try {
    await prisma.$connect();
    await connectRedis();
    stopScheduler = startPortfolioJobScheduler();

    server.listen(env.PORT, () => {
      console.log(`EstateOS API running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
      console.log('Portfolio job scheduler started');
    });
  } catch (error) {
    stopScheduler?.();
    await prisma.$disconnect();
    await disconnectRedis();
    console.error('Failed to start EstateOS API', error);
    process.exit(1);
  }
}

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received. Shutting down...`);
  stopScheduler?.();

  const forceShutdown = setTimeout(() => {
    console.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 10_000);
  forceShutdown.unref();

  server.close(async (error) => {
    try {
      if (error) {
        console.error('HTTP server shutdown failed', error);
        process.exitCode = 1;
      }

      await Promise.all([prisma.$disconnect(), disconnectRedis()]);
      console.log('EstateOS API shutdown complete');
    } catch (disconnectError) {
      console.error('Prisma shutdown failed', disconnectError);
      process.exitCode = 1;
    } finally {
      clearTimeout(forceShutdown);
      process.exit();
    }
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

void start();
