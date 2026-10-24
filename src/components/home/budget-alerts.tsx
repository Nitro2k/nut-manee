"use client";

import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { LEVEL_TEXT } from "@/components/budgets/budget-bar";
import { useBudgets } from "@/hooks/use-data";
import { budgetStatuses, spentByParent } from "@/lib/budget";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { Category, ID, Transaction } from "@/types";

/** Chips for parents at ≥ 80% of their limit this month (SPEC §7.1). Percent only, no amounts. */
export function BudgetAlerts({
  transactions,
  categories,
}: {
  transactions: readonly Transaction[];
  categories: ReadonlyMap<ID, Category>;
}) {
  const budgets = useBudgets();
  if (!budgets) return null;

  const alerts = budgetStatuses(budgets, categories, spentByParent(transactions, categories))
    .filter((s) => s.level !== "ok")
    // Most urgent first.
    .sort((a, b) => b.percent - a.percent);
  if (alerts.length === 0) return null;

  return (
    <div
      className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4"
      aria-label={strings.budgetAlertsLabel}
    >
      {alerts.map((s) => (
        <Link
          key={s.category.id}
          href="/more/budgets/"
          className={cn(
            "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm",
            s.level === "over" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50",
          )}
        >
          <CategoryIcon name={s.category.icon} className="size-4" />
          <span className="max-w-32 truncate">{s.category.name}</span>
          <span className={cn("font-medium tabular-nums", LEVEL_TEXT[s.level])}>
            {strings.percentUsed(s.percent)}
          </span>
        </Link>
      ))}
    </div>
  );
}
