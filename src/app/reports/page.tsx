"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { CategoryIcon } from "@/components/category-icon";
import { MonthSwitcher } from "@/components/home/month-switcher";
import { SummaryCard } from "@/components/home/summary-card";
import { Money } from "@/components/money";
import { useMonth } from "@/components/month-provider";
import { PressableRow } from "@/components/pressable-row";
import { PrivacyMenu } from "@/components/privacy-menu";
import { CategoryBars, percentLabel } from "@/components/reports/category-bars";
import { YearSwitcher } from "@/components/reports/year-switcher";
import { YearTrend } from "@/components/reports/year-trend";
import { TAB_BAR_SPACE } from "@/components/tab-bar";
import {
  useCategoryMap,
  useMonthTransactions,
  useSettings,
  useYearTransactions,
} from "@/hooks/use-data";
import { totals as sumTotals, type Totals } from "@/lib/aggregate";
import { addMonthsStr, formatMonth } from "@/lib/dates";
import {
  bestAndWorst,
  cashbackSummary,
  compareByParent,
  monthlyTotals,
  totalsByParent,
  type ParentChange,
} from "@/lib/report";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { Category, EntryType, ID, MonthStr, Transaction, YearFormat } from "@/types";

/** Rows shown in "vs last month"; the rest are small changes. */
const COMPARE_ROWS = 5;

type View = "month" | "year";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; className?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-muted p-1" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={cn(
            "h-9 flex-1 rounded-full text-sm font-medium",
            value === o.value && cn("bg-background shadow-sm", o.className),
          )}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const TYPE_OPTIONS: { value: EntryType; label: string; className: string }[] = [
  { value: "expense", label: strings.expense, className: "text-red-600" },
  { value: "income", label: strings.income, className: "text-emerald-700" },
];

export default function ReportsPage() {
  const { month, setMonth } = useMonth();
  const settings = useSettings();
  const categories = useCategoryMap();
  const [view, setView] = useState<View>("month");
  const [year, setYear] = useState(() => Number(month.slice(0, 4)));
  const [type, setType] = useState<EntryType>("expense");

  if (!settings || !categories) return null;

  const openMonth = (m: MonthStr) => {
    setMonth(m);
    setView("month");
  };

  return (
    <>
      <AppHeader
        title={
          view === "month" ? (
            <MonthSwitcher month={month} onChange={setMonth} yearFormat={settings.yearFormat} />
          ) : (
            <YearSwitcher year={year} onChange={setYear} yearFormat={settings.yearFormat} />
          )
        }
        right={<PrivacyMenu />}
      />
      <main className={cn("space-y-6 p-4", TAB_BAR_SPACE)}>
        <Segmented
          label={strings.reports}
          value={view}
          onChange={(next) => {
            // Keep the two views on the same period when switching.
            if (next === "year") setYear(Number(month.slice(0, 4)));
            setView(next);
          }}
          options={[
            { value: "month", label: strings.reportMonth },
            { value: "year", label: strings.reportYear },
          ]}
        />
        {view === "month" ? (
          <MonthReport
            month={month}
            setMonth={setMonth}
            categories={categories}
            type={type}
            setType={setType}
          />
        ) : (
          <YearReport
            year={year}
            setYear={setYear}
            categories={categories}
            type={type}
            setType={setType}
            yearFormat={settings.yearFormat}
            onOpenMonth={openMonth}
          />
        )}
      </main>
    </>
  );
}

interface SharedProps {
  categories: Map<ID, Category>;
  type: EntryType;
  setType: (type: EntryType) => void;
}

function Summary({ totals, onSwipe }: { totals: Totals; onSwipe: (direction: -1 | 1) => void }) {
  const rate = totals.income > 0 ? Math.round((totals.net * 100) / totals.income) : null;
  return (
    <div className="space-y-2">
      <SummaryCard totals={totals} onSwipe={onSwipe} />
      {rate !== null && (
        <p className="px-1 text-sm text-muted-foreground" data-testid="savings-rate">
          {rate >= 0 ? strings.savedRate(rate) : strings.overspentRate(-rate)}
        </p>
      )}
    </div>
  );
}

/** Type toggle + category bars + cashback: the parts both views share. */
function Breakdown({
  transactions,
  categories,
  type,
  setType,
  children,
}: SharedProps & { transactions: Transaction[]; children?: ReactNode }) {
  const byParent = totalsByParent(transactions, categories, type);
  const cashback = cashbackSummary(transactions, categories);
  const expense = sumTotals(transactions).expense;
  return (
    <>
      <Segmented label={strings.type} value={type} onChange={setType} options={TYPE_OPTIONS} />
      <Section title={strings.byCategory}>
        {byParent.length > 0 ? (
          <CategoryBars totals={byParent} type={type} />
        ) : (
          <p className="px-1 text-sm text-muted-foreground">{strings.noEntries}</p>
        )}
      </Section>
      {children}
      {cashback.total > 0 && (
        <Section title={strings.cashbackThisMonth}>
          <dl className="divide-y rounded-xl border text-sm">
            {cashback.bySource.map((s) => (
              <div key={s.category?.id ?? "general"} className="flex justify-between px-4 py-3">
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
                  <Money value={expense - cashback.linked} kind="expense" />
                </dd>
              </div>
            )}
          </dl>
        </Section>
      )}
    </>
  );
}

function Empty({ title }: { title: string }) {
  return (
    <div className="py-12 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{strings.noReportDataHint}</p>
    </div>
  );
}

function MonthReport({
  month,
  setMonth,
  ...shared
}: SharedProps & { month: MonthStr; setMonth: (month: MonthStr) => void }) {
  const transactions = useMonthTransactions(month);
  const previous = useMonthTransactions(addMonthsStr(month, -1));
  if (!transactions || !previous) return null;

  const changes = compareByParent(
    totalsByParent(transactions, shared.categories, shared.type),
    totalsByParent(previous, shared.categories, shared.type),
  ).slice(0, COMPARE_ROWS);

  return (
    <>
      <Summary
        totals={sumTotals(transactions)}
        onSwipe={(direction) => setMonth(addMonthsStr(month, direction))}
      />
      {transactions.length === 0 ? (
        <Empty title={strings.noReportData} />
      ) : (
        <Breakdown transactions={transactions} {...shared}>
          <Section title={strings.vsLastMonth}>
            {changes.length > 0 ? (
              <ul className="divide-y rounded-xl border">
                {changes.map((c) => (
                  <ChangeRow key={c.category.id} change={c} type={shared.type} />
                ))}
              </ul>
            ) : (
              <p className="px-1 text-sm text-muted-foreground">{strings.vsLastMonthEmpty}</p>
            )}
          </Section>
        </Breakdown>
      )}
    </>
  );
}

function YearReport({
  year,
  setYear,
  yearFormat,
  onOpenMonth,
  ...shared
}: SharedProps & {
  year: number;
  setYear: (year: number) => void;
  yearFormat: YearFormat;
  onOpenMonth: (month: MonthStr) => void;
}) {
  const transactions = useYearTransactions(year);
  const [selected, setSelected] = useState<MonthStr | null>(null);
  if (!transactions) return null;

  const months = monthlyTotals(transactions, year);
  const extremes = bestAndWorst(months);

  return (
    <>
      <Summary
        totals={sumTotals(transactions)}
        onSwipe={(direction) => setYear(year + direction)}
      />
      {transactions.length === 0 ? (
        <Empty title={strings.noYearData} />
      ) : (
        <>
          <Section title={strings.byMonth}>
            <YearTrend
              months={months}
              selected={selected?.startsWith(`${year}-`) ? selected : null}
              onSelect={(m) => setSelected(m === selected ? null : m)}
              onOpenMonth={onOpenMonth}
              yearFormat={yearFormat}
            />
          </Section>
          {extremes && extremes.best.month !== extremes.worst.month && (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(
                [
                  [strings.bestMonth, extremes.best],
                  [strings.worstMonth, extremes.worst],
                ] as const
              ).map(([label, m]) => (
                <PressableRow
                  key={label}
                  label={`${label}: ${formatMonth(m.month, yearFormat)}`}
                  onPress={() => onOpenMonth(m.month)}
                  className="rounded-xl border p-3 text-left"
                >
                  <span className="block text-xs text-muted-foreground">{label}</span>
                  <span className="block font-medium">{formatMonth(m.month, yearFormat)}</span>
                  <span className="block tabular-nums">
                    <Money value={m.net} kind="net" />
                  </span>
                </PressableRow>
              ))}
            </div>
          )}
          <Breakdown transactions={transactions} {...shared} />
        </>
      )}
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
          good ? "text-emerald-700" : "text-red-600",
        )}
      >
        <Arrow className="size-3.5" aria-label={up ? "up" : "down"} />
        {c.percent === null ? strings.newThisMonth : percentLabel(Math.abs(c.percent))}
      </span>
      <Money value={Math.abs(c.delta)} kind={type} className="w-24 text-right tabular-nums" />
    </li>
  );
}
