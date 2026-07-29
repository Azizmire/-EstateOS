import { LeaseStatus, PaymentStatus, UnitStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const JOB_INTERVAL_MS = 60 * 60 * 1000;
const EXPIRING_WINDOW_DAYS = 60;

let timer: NodeJS.Timeout | undefined;
let running = false;

export async function runPortfolioJobs(now = new Date()) {
  if (running) return;
  running = true;

  try {
    const expiringBy = new Date(now);
    expiringBy.setDate(expiringBy.getDate() + EXPIRING_WINDOW_DAYS);

    const [latePayments, expiringLeases, endedLeases] = await prisma.$transaction([
      prisma.payment.updateMany({
        where: {
          status: PaymentStatus.PENDING,
          dueDate: { lt: now },
        },
        data: { status: PaymentStatus.LATE },
      }),
      prisma.lease.updateMany({
        where: {
          status: LeaseStatus.ACTIVE,
          endDate: { gte: now, lte: expiringBy },
        },
        data: { status: LeaseStatus.EXPIRING },
      }),
      prisma.lease.updateMany({
        where: {
          status: { in: [LeaseStatus.ACTIVE, LeaseStatus.EXPIRING] },
          endDate: { lt: now },
        },
        data: { status: LeaseStatus.ENDED },
      }),
    ]);

    const endedUnitIds = await prisma.lease.findMany({
      where: {
        status: LeaseStatus.ENDED,
        endDate: { lt: now },
      },
      distinct: ['unitId'],
      select: { unitId: true },
    });

    let vacatedUnits = 0;

    for (const { unitId } of endedUnitIds) {
      const currentLease = await prisma.lease.findFirst({
        where: {
          unitId,
          status: { in: [LeaseStatus.ACTIVE, LeaseStatus.EXPIRING] },
          startDate: { lte: now },
          endDate: { gte: now },
        },
        select: { id: true },
      });

      if (!currentLease) {
        const result = await prisma.unit.updateMany({
          where: {
            id: unitId,
            status: UnitStatus.OCCUPIED,
          },
          data: { status: UnitStatus.VACANT },
        });
        vacatedUnits += result.count;
      }
    }

    console.log('EstateOS scheduled jobs completed', {
      latePayments: latePayments.count,
      expiringLeases: expiringLeases.count,
      endedLeases: endedLeases.count,
      vacatedUnits,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('EstateOS scheduled jobs failed', error);
  } finally {
    running = false;
  }
}

export function startPortfolioJobScheduler() {
  void runPortfolioJobs();
  timer = setInterval(() => void runPortfolioJobs(), JOB_INTERVAL_MS);
  timer.unref();

  return () => {
    if (timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}
