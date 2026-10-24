"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { monthRange } from "@/lib/dates";
import { SETTINGS_ID } from "@/lib/repo/settings";
import { listTransactions, recentCategoryIds } from "@/lib/repo/transactions";
import type { Category, EntryType, ID, MonthStr } from "@/types";

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
