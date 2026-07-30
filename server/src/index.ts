import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { startPortfolioJobScheduler } from './jobs/scheduler.js';
import { logError, logInfo } from './lib/logger.js';
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
      logInfo('EstateOS API started', {
        environment: env.NODE_ENV,
        port: env.PORT,
        scheduler: 'started',
      });
    });
  } catch (error) {
    stopScheduler?.();
    await prisma.$disconnect();
    await disconnectRedis();
    logError('Failed to start EstateOS API', error);
    process.exit(1);
  }
}

const shutdown = async (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;

  logInfo('EstateOS API shutdown requested', { signal });
  stopScheduler?.();

  const forceShutdown = setTimeout(() => {
    logError('Graceful shutdown timed out; forcing exit');
    process.exit(1);
  }, 10_000);
  forceShutdown.unref();

  server.close(async (error) => {
    try {
      if (error) {
        logError('HTTP server shutdown failed', error);
        process.exitCode = 1;
      }

      await Promise.all([prisma.$disconnect(), disconnectRedis()]);
      logInfo('EstateOS API shutdown complete');
    } catch (disconnectError) {
      logError('Dependency shutdown failed', disconnectError);
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
