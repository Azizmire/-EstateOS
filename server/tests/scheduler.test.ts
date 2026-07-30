import { beforeEach, describe, expect, it, vi } from 'vitest';

const database = vi.hoisted(() => ({
  paymentFindMany: vi.fn(),
  paymentUpdateMany: vi.fn(),
  leaseFindMany: vi.fn(),
  leaseFindFirst: vi.fn(),
  leaseUpdateMany: vi.fn(),
  userFindMany: vi.fn(),
  unitUpdateMany: vi.fn(),
  notificationCreateMany: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

const locks = vi.hoisted(() => ({
  acquire: vi.fn(),
  release: vi.fn(),
}));

vi.mock('../src/lib/prisma.js', () => ({
  prisma: {
    payment: {
      findMany: database.paymentFindMany,
      updateMany: database.paymentUpdateMany,
    },
    lease: {
      findMany: database.leaseFindMany,
      findFirst: database.leaseFindFirst,
      updateMany: database.leaseUpdateMany,
    },
    user: { findMany: database.userFindMany },
    unit: { updateMany: database.unitUpdateMany },
    notification: { createMany: database.notificationCreateMany },
    auditLog: { create: database.auditCreate },
    $transaction: database.transaction,
    $disconnect: vi.fn(),
  },
}));

vi.mock('../src/lib/redis.js', () => ({
  acquireJobLock: locks.acquire,
  releaseJobLock: locks.release,
}));

import { runPortfolioJobs, startPortfolioJobScheduler } from '../src/jobs/scheduler.js';

describe('portfolio scheduler', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    locks.acquire.mockResolvedValue('lock-token');
    locks.release.mockResolvedValue(undefined);
    database.paymentFindMany.mockResolvedValue([]);
    database.leaseFindMany.mockResolvedValue([]);
    database.leaseFindFirst.mockResolvedValue(null);
    database.userFindMany.mockResolvedValue([]);
    database.paymentUpdateMany.mockResolvedValue({ count: 0 });
    database.leaseUpdateMany.mockResolvedValue({ count: 0 });
    database.transaction.mockResolvedValue([{ count: 0 }, { count: 0 }, { count: 0 }]);
    database.unitUpdateMany.mockResolvedValue({ count: 0 });
    database.notificationCreateMany.mockResolvedValue({ count: 0 });
    database.auditCreate.mockResolvedValue({});
  });

  it('updates portfolio state, vacates units, writes notifications, and audits work', async () => {
    const now = new Date('2026-07-29T12:00:00.000Z');
    database.paymentFindMany.mockResolvedValue([
      { id: 'payment-1', dueDate: new Date('2026-07-28T12:00:00.000Z') },
    ]);
    database.leaseFindMany
      .mockResolvedValueOnce([
        { id: 'lease-1', endDate: new Date('2026-08-15T12:00:00.000Z') },
      ])
      .mockResolvedValueOnce([{ unitId: 'unit-1' }, { unitId: 'unit-2' }]);
    database.userFindMany.mockResolvedValue([{ id: 'admin-1' }, { id: 'manager-1' }]);
    database.transaction.mockResolvedValue([{ count: 1 }, { count: 1 }, { count: 2 }]);
    database.leaseFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'active-lease' });
    database.unitUpdateMany.mockResolvedValue({ count: 1 });

    await runPortfolioJobs(now);

    expect(database.unitUpdateMany).toHaveBeenCalledTimes(1);
    expect(database.notificationCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ type: 'PAYMENT_LATE', userId: 'admin-1' }),
        expect.objectContaining({ type: 'LEASE_EXPIRING', userId: 'manager-1' }),
      ]),
      skipDuplicates: true,
    });
    expect(database.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'scheduler.portfolio.completed',
        metadata: expect.objectContaining({ notifications: 4, vacatedUnits: 1 }),
      }),
    });
    expect(locks.release).toHaveBeenCalledWith('estateos:jobs:portfolio', 'lock-token');
  });

  it('does nothing when another replica owns the lock', async () => {
    locks.acquire.mockResolvedValue(null);

    await runPortfolioJobs();

    expect(database.paymentFindMany).not.toHaveBeenCalled();
    expect(locks.release).not.toHaveBeenCalled();
  });

  it('logs failures and still releases the distributed lock', async () => {
    database.paymentFindMany.mockRejectedValue(new Error('database unavailable'));

    await runPortfolioJobs();

    expect(console.error).toHaveBeenCalledWith(
      'EstateOS scheduled jobs failed',
      expect.any(Error),
    );
    expect(locks.release).toHaveBeenCalled();
  });

  it('starts and stops the hourly timer', () => {
    vi.useFakeTimers();
    const stop = startPortfolioJobScheduler();
    expect(vi.getTimerCount()).toBe(1);
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});
