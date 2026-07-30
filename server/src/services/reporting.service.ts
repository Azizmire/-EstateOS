type DecimalLike = number | { toNumber(): number };

type PaidPayment = {
  amount: DecimalLike;
  paidAt: Date | null;
};

type RecordedExpense = {
  amount: DecimalLike;
  incurredAt: Date;
};

const amount = (value: DecimalLike) =>
  typeof value === 'number' ? value : value.toNumber();

const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

export function buildMonthlyFinancialReport(
  payments: PaidPayment[],
  expenses: RecordedExpense[],
  from: Date,
  to: Date,
) {
  const monthly = new Map<string, { month: string; revenue: number; expenses: number; net: number }>();
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const finalMonth = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));

  while (cursor <= finalMonth) {
    const key = monthKey(cursor);
    monthly.set(key, { month: key, revenue: 0, expenses: 0, net: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  for (const payment of payments) {
    if (!payment.paidAt) continue;
    const row = monthly.get(monthKey(payment.paidAt));
    if (row) row.revenue += amount(payment.amount);
  }

  for (const expense of expenses) {
    const row = monthly.get(monthKey(expense.incurredAt));
    if (row) row.expenses += amount(expense.amount);
  }

  const months = [...monthly.values()].map((row) => ({
    ...row,
    net: row.revenue - row.expenses,
  }));
  const revenue = months.reduce((sum, row) => sum + row.revenue, 0);
  const expenseTotal = months.reduce((sum, row) => sum + row.expenses, 0);

  return {
    period: { from, to },
    totals: { revenue, expenses: expenseTotal, net: revenue - expenseTotal },
    months,
  };
}
