import { totals, type Totals } from "@/lib/aggregate";
import { parseBaht } from "@/lib/money";
import type { Category, DateStr, EntryType, ID, MonthStr, Satang, Transaction } from "@/types";

// Search (SPEC §7.4). Pure: callers pass all live transactions and the category map.

export interface SearchFilters {
  query: string;
  type: EntryType | "all";
  /** A parent includes its children. */
  categoryId: ID | null;
  minAmount: Satang | null;
  maxAmount: Satang | null;
  from: DateStr | null;
  to: DateStr | null;
}

export const EMPTY_FILTERS: SearchFilters = {
  query: "",
  type: "all",
  categoryId: null,
  minAmount: null,
  maxAmount: null,
  from: null,
  to: null,
};

/** Filters other than the text query and type (shown as a count on the Filters button). */
export function activeFilterCount(f: SearchFilters): number {
  return [f.categoryId, f.minAmount ?? f.maxAmount, f.from ?? f.to].filter((v) => v !== null)
    .length;
}

export function hasCriteria(f: SearchFilters): boolean {
  return f.query.trim() !== "" || f.type !== "all" || activeFilterCount(f) > 0;
}

/** Case-insensitive, NFC-normalized, so Thai typed different ways still matches. */
function normalize(text: string): string {
  return text.normalize("NFC").toLocaleLowerCase();
}

/**
 * Matching entries, newest first. The query matches the note, the category or its parent's
 * name (substring), or, if it reads as an amount ("450", "1,200.50"), the exact amount.
 */
export function searchTransactions(
  transactions: readonly Transaction[],
  categories: ReadonlyMap<ID, Category>,
  f: SearchFilters,
): Transaction[] {
  const query = normalize(f.query.trim());
  const queryAmount = query ? parseBaht(query) : null;
  return transactions
    .filter((t) => {
      if (t.deletedAt !== null) return false;
      if (f.type !== "all" && t.type !== f.type) return false;
      if (f.minAmount !== null && t.amount < f.minAmount) return false;
      if (f.maxAmount !== null && t.amount > f.maxAmount) return false;
      if (f.from && t.date < f.from) return false;
      if (f.to && t.date > f.to) return false;
      const category = categories.get(t.categoryId);
      const parent = category?.parentId ? categories.get(category.parentId) : undefined;
      if (f.categoryId && t.categoryId !== f.categoryId && parent?.id !== f.categoryId) {
        return false;
      }
      if (!query) return true;
      if (queryAmount !== null && t.amount === queryAmount) return true;
      return [t.note, category?.name, parent?.name].some(
        (text) => !!text && normalize(text).includes(query),
      );
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        b.time.localeCompare(a.time) ||
        b.createdAt.localeCompare(a.createdAt),
    );
}

export interface MonthGroup {
  month: MonthStr;
  transactions: Transaction[];
  totals: Totals;
}

/** Group (already sorted) results by month, keeping their order. */
export function groupByMonth(transactions: readonly Transaction[]): MonthGroup[] {
  const groups = new Map<MonthStr, Transaction[]>();
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    const list = groups.get(month);
    if (list) list.push(t);
    else groups.set(month, [t]);
  }
  return [...groups].map(([month, list]) => ({ month, transactions: list, totals: totals(list) }));
}
