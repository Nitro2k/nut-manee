"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { BudgetBar, LEVEL_TEXT } from "@/components/budgets/budget-bar";
import { BudgetSheet, type BudgetSheetTarget } from "@/components/budgets/budget-sheet";
import { CategoryIcon } from "@/components/category-icon";
import { MonthSwitcher } from "@/components/home/month-switcher";
import { Money } from "@/components/money";
import { PressableRow } from "@/components/pressable-row";
import { useMonth } from "@/components/month-provider";
import { TAB_BAR_SPACE } from "@/components/tab-bar";
import { Button } from "@/components/ui/button";
import { useBudgets, useCategoryMap, useMonthTransactions, useSettings } from "@/hooks/use-data";
import { budgetStatuses, spentByParent } from "@/lib/budget";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

export default function BudgetsPage() {
  const { month, setMonth } = useMonth();
  const settings = useSettings();
  const categories = useCategoryMap();
  const budgets = useBudgets();
  const transactions = useMonthTransactions(month);
  const [sheet, setSheet] = useState<BudgetSheetTarget | null>(null);

  if (!settings || !categories || !budgets || !transactions) return null;

  const spent = spentByParent(transactions, categories);
  const statuses = new Map(
    budgetStatuses(budgets, categories, spent).map((s) => [s.category.id, s]),
  );
  const parents = [...categories.values()]
    .filter((c) => c.type === "expense" && c.parentId === null && !c.deletedAt && !c.archived)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      <AppHeader
        left={
          <Button variant="ghost" size="icon" className="size-11" aria-label={strings.back} asChild>
            <Link href="/more/">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
        }
        title={strings.budgets}
      />
      <main className={cn("space-y-3 p-4", TAB_BAR_SPACE)}>
        <div className="flex justify-center">
          <MonthSwitcher month={month} onChange={setMonth} yearFormat={settings.yearFormat} />
        </div>
        <p className="text-sm text-muted-foreground">{strings.budgetsHint}</p>
        <ul className="divide-y rounded-xl border">
          {parents.map((category) => {
            const status = statuses.get(category.id);
            const open = () => setSheet({ category, limit: status?.limit ?? null });
            return (
              <li key={category.id}>
                <PressableRow
                  label={strings.budgetFor(category.name)}
                  onPress={open}
                  className="flex min-h-14 items-center gap-3 px-4 py-3 text-sm"
                  testId="budget-row"
                >
                  <CategoryIcon name={category.icon} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium">{category.name}</span>
                      {status ? (
                        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                          <Money value={status.spent} kind="expense" /> /{" "}
                          <Money value={status.limit} kind="neutral" />
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {strings.noLimit}
                        </span>
                      )}
                    </div>
                    {status && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <BudgetBar
                            percent={status.percent}
                            level={status.level}
                            label={category.name}
                          />
                        </div>
                        <span
                          className={cn(
                            "w-10 text-right text-xs font-medium tabular-nums",
                            LEVEL_TEXT[status.level],
                          )}
                        >
                          {strings.percentUsed(status.percent)}
                        </span>
                      </div>
                    )}
                  </div>
                </PressableRow>
              </li>
            );
          })}
        </ul>
      </main>
      <BudgetSheet target={sheet} onClose={() => setSheet(null)} />
    </>
  );
}
