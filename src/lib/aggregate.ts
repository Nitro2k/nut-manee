import type { DateStr, Satang, Transaction } from "@/types";

export interface Totals {
  income: Satang;
  expense: Satang;
  /** income − expense */
  net: Satang;
}

export function totals(transactions: readonly Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  return { income, expense, net: income - expense };
}

export interface DayGroup {
  date: DateStr;
  transactions: Transaction[];
  totals: Totals;
}

/** Group transactions by date, keeping the input order (e.g. newest first). */
export function groupByDay(transactions: readonly Transaction[]): DayGroup[] {
  const byDate = new Map<DateStr, Transaction[]>();
  for (const t of transactions) {
    const list = byDate.get(t.date);
    if (list) list.push(t);
    else byDate.set(t.date, [t]);
  }
  return [...byDate].map(([date, list]) => ({ date, transactions: list, totals: totals(list) }));
}
