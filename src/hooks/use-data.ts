"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { monthRange, yearRange } from "@/lib/dates";
import { listBudgets } from "@/lib/repo/budgets";
import { SETTINGS_ID } from "@/lib/repo/settings";
import { isLive } from "@/lib/repo/base";
import { listLinkedCashback, listTransactions, recentCategoryIds } from "@/lib/repo/transactions";
import type { Category, EntryType, ID, MonthStr, Satang, Transaction } from "@/types";

// Live queries: components re-render when the underlying rows change.

export function useSettings() {
  return useLiveQuery(() => db.settings.get(SETTINGS_ID), []);
}

export function useMonthTransactions(month: MonthStr) {
  return useLiveQuery(() => {
    const { start, end } = monthRange(month);
    return listTransactions(start, end);
  }, [month]);
}

export function useYearTransactions(year: number) {
  return useLiveQuery(() => {
    const { start, end } = yearRange(year);
    return listTransactions(start, end);
  }, [year]);
}

/** Every category by id, including archived and deleted ones (old entries still need names). */
export function useCategoryMap() {
  return useLiveQuery(
    async () => new Map<ID, Category>((await db.categories.toArray()).map((c) => [c.id, c])),
    [],
  );
}

export function useRecentCategoryIds(type: EntryType) {
  return useLiveQuery(() => recentCategoryIds(type), [type]);
}

export function useBudgets() {
  return useLiveQuery(listBudgets, []);
}

/** Live cashback entries linked to one expense. */
export function useLinkedCashback(expenseId: ID | undefined): Transaction[] | undefined {
  return useLiveQuery(async () => (expenseId ? listLinkedCashback(expenseId) : []), [expenseId]);
}

/** Total linked cashback per expense id, for the given expenses (any month). */
export function useCashbackTotals(expenseIds: readonly ID[]): Map<ID, Satang> | undefined {
  const key = expenseIds.join(",");
  return useLiveQuery(async () => {
    const totals = new Map<ID, Satang>();
    if (expenseIds.length === 0) return totals;
    const rows = await db.transactions
      .where("linkedExpenseId")
      .anyOf(expenseIds)
      .filter(isLive)
      .toArray();
    for (const t of rows) {
      if (t.linkedExpenseId)
        totals.set(t.linkedExpenseId, (totals.get(t.linkedExpenseId) ?? 0) + t.amount);
    }
    return totals;
  }, [key]); // `key` stands for the id list
}

/** Every live entry (search filters these in memory). */
export function useAllTransactions() {
  return useLiveQuery(() => db.transactions.filter(isLive).toArray(), []);
}
