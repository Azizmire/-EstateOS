import { describe, expect, it } from 'vitest';
import { buildMonthlyFinancialReport } from '../src/services/reporting.service.js';

describe('buildMonthlyFinancialReport', () => {
  it('builds a complete monthly revenue, expense, and net series', () => {
    const report = buildMonthlyFinancialReport(
      [
        { amount: { toNumber: () => 1200 }, paidAt: new Date('2026-01-10T00:00:00Z') },
        { amount: 1300, paidAt: new Date('2026-03-10T00:00:00Z') },
      ],
      [
        { amount: { toNumber: () => 200 }, incurredAt: new Date('2026-01-20T00:00:00Z') },
        { amount: 100, incurredAt: new Date('2026-02-20T00:00:00Z') },
      ],
      new Date('2026-01-01T00:00:00Z'),
      new Date('2026-03-31T23:59:59Z'),
    );

    expect(report.months).toEqual([
      { month: '2026-01', revenue: 1200, expenses: 200, net: 1000 },
      { month: '2026-02', revenue: 0, expenses: 100, net: -100 },
      { month: '2026-03', revenue: 1300, expenses: 0, net: 1300 },
    ]);
    expect(report.totals).toEqual({ revenue: 2500, expenses: 300, net: 2200 });
  });
});
