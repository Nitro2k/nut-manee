import type { Category, EntryType, ID, Satang, Transaction } from "@/types";

// Monthly report math (SPEC §7.3). Pure: callers pass one month's live transactions.

export interface ChildTotal {
  /** null = entries on the parent itself ("General"). */
  category: Category | null;
  amount: Satang;
}

export interface ParentTotal {
  category: Category;
  amount: Satang;
  /** Share of the type's total, 0–100. */
  percent: number;
  /** Largest first; empty when the parent has no subcategory entries. */
  children: ChildTotal[];
}

const byAmountDesc = <T extends { amount: Satang }>(a: T, b: T) => b.amount - a.amount;

/** The top-level category an entry counts toward (itself if it's a parent). */
function parentOf(categories: ReadonlyMap<ID, Category>, categoryId: ID): Category | undefined {
  const category = categories.get(categoryId);
  return category?.parentId ? categories.get(category.parentId) : category;
}

/** Totals per parent category for one type, largest first, with a child breakdown. */
export function totalsByParent(
  transactions: readonly Transaction[],
  categories: ReadonlyMap<ID, Category>,
  type: EntryType,
): ParentTotal[] {
  const parents = new Map<
    ID,
    { category: Category; amount: Satang; children: Map<ID, ChildTotal> }
  >();
  let total = 0;
  for (const t of transactions) {
    if (t.type !== type || t.deletedAt !== null) continue;
    const parent = parentOf(categories, t.categoryId);
    if (!parent) continue;
    total += t.amount;
    const entry = parents.get(parent.id) ?? { category: parent, amount: 0, children: new Map() };
    entry.amount += t.amount;
    const child = t.categoryId === parent.id ? null : (categories.get(t.categoryId) ?? null);
    const key = child?.id ?? "general";
    const childEntry = entry.children.get(key) ?? { category: child, amount: 0 };
    childEntry.amount += t.amount;
    entry.children.set(key, childEntry);
    parents.set(parent.id, entry);
  }
  return [...parents.values()]
    .map(({ category, amount, children }) => {
      const list = [...children.values()].sort(byAmountDesc);
      return {
        category,
        amount,
        percent: total > 0 ? (amount * 100) / total : 0,
        // A single "General" row adds nothing to the breakdown.
        children: list.length === 1 && list[0]?.category === null ? [] : list,
      };
    })
    .sort(byAmountDesc);
}

export interface ParentChange {
  category: Category;
  current: Satang;
  previous: Satang;
  /** current − previous */
  delta: Satang;
  /** Change vs previous in percent; null when previous was 0 (new this month). */
  percent: number | null;
}

/** Per-parent change between two months for one type, biggest change first. */
export function compareByParent(
  current: readonly ParentTotal[],
  previous: readonly ParentTotal[],
): ParentChange[] {
  const rows = new Map<ID, ParentChange>();
  const row = (category: Category) =>
    rows.get(category.id) ?? { category, current: 0, previous: 0, delta: 0, percent: null };
  for (const p of current) rows.set(p.category.id, { ...row(p.category), current: p.amount });
  for (const p of previous) rows.set(p.category.id, { ...row(p.category), previous: p.amount });
  return [...rows.values()]
    .map((r) => ({
      ...r,
      delta: r.current - r.previous,
      percent: r.previous > 0 ? ((r.current - r.previous) * 100) / r.previous : null,
    }))
    .filter((r) => r.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export interface CashbackSummary {
  /** All income in the Cashback category tree. */
  total: Satang;
  bySource: ChildTotal[];
  /** Cashback linked to an expense (what "expense after cashback" subtracts). */
  linked: Satang;
}

/** Cashback received this month, per source (SPEC §2: full price elsewhere). */
export function cashbackSummary(
  transactions: readonly Transaction[],
  categories: ReadonlyMap<ID, Category>,
): CashbackSummary {
  const root = [...categories.values()].find((c) => c.systemKey === "cashback");
  const income = root
    ? totalsByParent(transactions, categories, "income").find((p) => p.category.id === root.id)
    : undefined;
  let linked = 0;
  for (const t of transactions) {
    if (t.type === "income" && t.deletedAt === null && t.linkedExpenseId) linked += t.amount;
  }
  const bySource = income?.children.length
    ? income.children
    : income
      ? [{ category: null, amount: income.amount }]
      : [];
  return { total: income?.amount ?? 0, bySource, linked };
}
