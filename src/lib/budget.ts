import type { Budget, Category, ID, Satang, Transaction } from "@/types";

// Monthly budget math (SPEC §7.1, §7.5). Pure: callers pass one month's live transactions.

export const WARN_PERCENT = 80;

export type BudgetLevel = "ok" | "warn" | "over";

export interface BudgetStatus {
  category: Category;
  limit: Satang;
  spent: Satang;
  /** Whole percent, rounded down (99.9% is still 99%). */
  percent: number;
  level: BudgetLevel;
}

/** Expense spent per parent category: a child's entries count toward its parent. */
export function spentByParent(
  transactions: readonly Transaction[],
  categories: ReadonlyMap<ID, Category>,
): Map<ID, Satang> {
  const spent = new Map<ID, Satang>();
  for (const t of transactions) {
    if (t.type !== "expense" || t.deletedAt !== null) continue;
    const category = categories.get(t.categoryId);
    const parentId = category?.parentId ?? t.categoryId;
    spent.set(parentId, (spent.get(parentId) ?? 0) + t.amount);
  }
  return spent;
}

export function budgetLevel(percent: number): BudgetLevel {
  return percent >= 100 ? "over" : percent >= WARN_PERCENT ? "warn" : "ok";
}

/**
 * Status for every live budget with a limit on a live expense parent, in category order.
 * Budgets left on a category that is no longer a parent are ignored.
 */
export function budgetStatuses(
  budgets: readonly Budget[],
  categories: ReadonlyMap<ID, Category>,
  spent: ReadonlyMap<ID, Satang>,
): BudgetStatus[] {
  return budgets
    .flatMap((b) => {
      const category = categories.get(b.categoryId);
      if (b.deletedAt !== null || b.monthlyLimit === null || !category) return [];
      if (
        category.deletedAt !== null ||
        category.parentId !== null ||
        category.type !== "expense"
      ) {
        return [];
      }
      const amount = spent.get(category.id) ?? 0;
      const percent = Math.floor((amount * 100) / b.monthlyLimit);
      return [
        { category, limit: b.monthlyLimit, spent: amount, percent, level: budgetLevel(percent) },
      ];
    })
    .sort((a, b) => a.category.order - b.category.order);
}
