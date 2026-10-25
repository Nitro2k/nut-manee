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

/** Every live entry (search filters these in memory). */
export function useAllTransactions() {
  return useLiveQuery(() => db.transactions.filter(isLive).toArray(), []);
}

/** All-time balance: every live income minus every live expense. Updates live. */
export function useBalance(): Satang | undefined {
  return useLiveQuery(async () => {
    let balance = 0;
    await db.transactions.each((t) => {
      if (t.deletedAt === null) balance += t.type === "income" ? t.amount : -t.amount;
    });
    return balance;
  }, []);
}
