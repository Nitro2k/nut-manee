"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { CategoryIcon } from "@/components/category-icon";
import { MonthSwitcher } from "@/components/home/month-switcher";
import { SummaryCard } from "@/components/home/summary-card";
import { Money } from "@/components/money";
import { useMonth } from "@/components/month-provider";
import { PrivacyMenu } from "@/components/privacy-menu";
import { CategoryBars, percentLabel } from "@/components/reports/category-bars";
import { TAB_BAR_SPACE } from "@/components/tab-bar";
import { useCategoryMap, useMonthTransactions, useSettings } from "@/hooks/use-data";
import { totals as sumTotals } from "@/lib/aggregate";
import { addMonthsStr } from "@/lib/dates";
import { cashbackSummary, compareByParent, totalsByParent, type ParentChange } from "@/lib/report";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { EntryType } from "@/types";

/** Rows shown in "vs last month"; the rest are small changes. */
const COMPARE_ROWS = 5;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default function ReportsPage() {
  const { month, setMonth } = useMonth();
  const settings = useSettings();
  const categories = useCategoryMap();
  const transactions = useMonthTransactions(month);
  const previous = useMonthTransactions(addMonthsStr(month, -1));
  const [type, setType] = useState<EntryType>("expense");

  if (!settings || !categories || !transactions || !previous) return null;

  const totals = sumTotals(transactions);
  const byParent = totalsByParent(transactions, categories, type);
  const changes = compareByParent(byParent, totalsByParent(previous, categories, type)).slice(
    0,
    COMPARE_ROWS,
  );
  const cashback = cashbackSummary(transactions, categories);
  const rate = totals.income > 0 ? Math.round((totals.net * 100) / totals.income) : null;

  return (
    <>
      <AppHeader
        title={<MonthSwitcher month={month} onChange={setMonth} yearFormat={settings.yearFormat} />}
        right={<PrivacyMenu />}
      />
      <main className={cn("space-y-6 p-4", TAB_BAR_SPACE)}>
        <div className="space-y-2">
          <SummaryCard
            totals={totals}
            onSwipe={(direction) => setMonth(addMonthsStr(month, direction))}
          />
          {rate !== null && (
            <p className="px-1 text-sm text-muted-foreground" data-testid="savings-rate">
              {rate >= 0 ? strings.savedRate(rate) : strings.overspentRate(-rate)}
            </p>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-medium">{strings.noReportData}</p>
            <p className="text-sm text-muted-foreground">{strings.noReportDataHint}</p>
          </div>
        ) : (
          <>
            <div
              className="flex rounded-full bg-muted p-1"
              role="radiogroup"
              aria-label={strings.type}
            >
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={type === t}
                  className={cn(
                    "h-9 flex-1 rounded-full text-sm font-medium",
                    type === t && "bg-background shadow-sm",
                    type === t && (t === "income" ? "text-emerald-600" : "text-red-600"),
                  )}
                  onClick={() => setType(t)}
                >
                  {t === "income" ? strings.income : strings.expense}
                </button>
              ))}
            </div>

            <Section title={strings.byCategory}>
              {byParent.length > 0 ? (
                <CategoryBars totals={byParent} type={type} />
              ) : (
                <p className="px-1 text-sm text-muted-foreground">{strings.noEntries}</p>
              )}
            </Section>

            <Section title={strings.vsLastMonth}>
              {changes.length > 0 ? (
                <ul className="divide-y rounded-xl border">
                  {changes.map((c) => (
                    <ChangeRow key={c.category.id} change={c} type={type} />
                  ))}
                </ul>
              ) : (
                <p className="px-1 text-sm text-muted-foreground">{strings.vsLastMonthEmpty}</p>
              )}
            </Section>

            {cashback.total > 0 && (
              <Section title={strings.cashbackThisMonth}>
                <dl className="divide-y rounded-xl border text-sm">
                  {cashback.bySource.map((s) => (
                    <div
                      key={s.category?.id ?? "general"}
                      className="flex justify-between px-4 py-3"
                    >
                      <dt>{s.category?.name ?? strings.general}</dt>
                      <dd>
                        <Money value={s.amount} kind="income" />
                      </dd>
                    </div>
                  ))}
                  {cashback.linked > 0 && (
                    <div className="flex justify-between px-4 py-3 font-medium">
                      <dt>{strings.expenseAfterCashback}</dt>
                      <dd>
                        <Money value={totals.expense - cashback.linked} kind="expense" />
                      </dd>
                    </div>
                  )}
                </dl>
              </Section>
            )}
          </>
        )}
      </main>
    </>
  );
}

/** One parent's change vs last month: arrow + % (safe while hidden), amount via <Money>. */
function ChangeRow({ change: c, type }: { change: ParentChange; type: EntryType }) {
  const up = c.delta > 0;
  // More expense is bad, more income is good; color only on the arrow + % text.
  const good = type === "income" ? up : !up;
  const Arrow = up ? ArrowUp : ArrowDown;
  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      <CategoryIcon name={c.category.icon} />
      <span className="min-w-0 flex-1 truncate">{c.category.name}</span>
      <span
        className={cn(
          "flex items-center gap-0.5 text-xs font-medium tabular-nums",
          good ? "text-emerald-600" : "text-red-600",
        )}
      >
        <Arrow className="size-3.5" aria-label={up ? "up" : "down"} />
        {c.percent === null ? strings.newThisMonth : percentLabel(Math.abs(c.percent))}
      </span>
      <Money value={Math.abs(c.delta)} kind={type} className="w-24 text-right tabular-nums" />
    </li>
  );
}
