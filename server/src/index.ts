import { createServer } from 'node:http';
import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';

const server = createServer(app);

async function start() {
  try {
    await prisma.$connect();
    server.listen(env.PORT, () => {
      console.log(`EstateOS API running on http://localhost:${env.PORT}`);
      console.log(`Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error('Failed to start EstateOS API', error);
    process.exit(1);
  }
}

const shutdown = async (signal: string) => {
  console.log(`${signal} received. Shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

void start();