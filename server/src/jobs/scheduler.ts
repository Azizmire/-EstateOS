import {
  LeaseStatus,
  NotificationType,
  PaymentStatus,
  UnitStatus,
  UserRole,
} from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logError, logInfo } from '../lib/logger.js';
import { acquireJobLock, releaseJobLock } from '../lib/redis.js';

const JOB_INTERVAL_MS = 60 * 60 * 1000;
const EXPIRING_WINDOW_DAYS = 60;

let timer: NodeJS.Timeout | undefined;
let running = false;

export async function runPortfolioJobs(now = new Date()) {
  if (running) return;
  running = true;
  let lockToken: string | null = null;

  try {
    lockToken = await acquireJobLock('estateos:jobs:portfolio', JOB_INTERVAL_MS - 60_000);
    if (!lockToken) return;
    const expiringBy = new Date(now);
    expiringBy.setDate(expiringBy.getDate() + EXPIRING_WINDOW_DAYS);

    const [lateCandidates, expiringCandidates, recipients] = await Promise.all([
      prisma.payment.findMany({
        where: { status: PaymentStatus.PENDING, dueDate: { lt: now } },
        select: { id: true, dueDate: true },
      }),
      prisma.lease.findMany({
        where: {
          status: LeaseStatus.ACTIVE,
          endDate: { gte: now, lte: expiringBy },
        },
        select: { id: true, endDate: true },
      }),
      prisma.user.findMany({
        where: { role: { in: [UserRole.ADMIN, UserRole.MANAGER] } },
        select: { id: true },
      }),
    ]);

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

    const notifications = recipients.flatMap(({ id: userId }) => [
      ...lateCandidates.map((payment) => ({
        userId,
        type: NotificationType.PAYMENT_LATE,
        title: 'Payment is late',
        message: `Payment due ${payment.dueDate.toISOString().slice(0, 10)} is now late.`,
        entityType: 'payment',
        entityId: payment.id,
        dedupeKey: `payment-late:${payment.id}:${userId}`,
      })),
      ...expiringCandidates.map((lease) => ({
        userId,
        type: NotificationType.LEASE_EXPIRING,
        title: 'Lease is expiring',
        message: `Lease expires ${lease.endDate.toISOString().slice(0, 10)}.`,
        entityType: 'lease',
        entityId: lease.id,
        dedupeKey: `lease-expiring:${lease.id}:${lease.endDate.toISOString()}:${userId}`,
      })),
    ]);

    if (notifications.length > 0) {
      await prisma.notification.createMany({ data: notifications, skipDuplicates: true });
    }

    if (
      latePayments.count
      + expiringLeases.count
      + endedLeases.count
      + vacatedUnits
      + notifications.length
      > 0
    ) {
      await prisma.auditLog.create({
        data: {
          action: 'scheduler.portfolio.completed',
          entityType: 'system',
          metadata: {
            latePayments: latePayments.count,
            expiringLeases: expiringLeases.count,
            endedLeases: endedLeases.count,
            vacatedUnits,
            notifications: notifications.length,
          },
        },
      });
    }

    logInfo('EstateOS scheduled jobs completed', {
      latePayments: latePayments.count,
      expiringLeases: expiringLeases.count,
      endedLeases: endedLeases.count,
      vacatedUnits,
      notifications: notifications.length,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    logError('EstateOS scheduled jobs failed', error);
  } finally {
    if (lockToken) {
      await releaseJobLock('estateos:jobs:portfolio', lockToken).catch((error) => {
        logError('EstateOS scheduler lock release failed', error);
      });
    }
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
