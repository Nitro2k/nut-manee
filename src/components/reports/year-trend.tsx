"use client";

import { format, parseISO } from "date-fns";
import type { ReactNode } from "react";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { formatMonth } from "@/lib/dates";
import type { MonthTotals } from "@/lib/report";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { MonthStr, YearFormat } from "@/types";

const CHART_PX = 128;

/** Bar height in px; a non-zero month always gets a visible sliver. */
function barHeight(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(2, Math.round((value / max) * CHART_PX));
}

/**
 * 12-month income vs expense bars (one axis, no values on it, so it's safe while amounts are
 * hidden). Tap a month to see its numbers below the chart; amounts go through <Money>.
 */
export function YearTrend({
  months,
  selected,
  onSelect,
  onOpenMonth,
  yearFormat,
}: {
  months: MonthTotals[];
  selected: MonthStr | null;
  onSelect: (month: MonthStr) => void;
  onOpenMonth: (month: MonthStr) => void;
  yearFormat: YearFormat;
}) {
  const max = Math.max(...months.flatMap((m) => [m.income, m.expense]));
  const picked = months.find((m) => m.month === selected);

  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex gap-4 text-xs text-muted-foreground" aria-hidden>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-emerald-500" />
          {strings.income}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-red-500" />
          {strings.expense}
        </span>
      </div>

      <div className="grid grid-cols-12 gap-0.5" role="group" aria-label={strings.byMonth}>
        {months.map((m) => {
          const label = format(parseISO(`${m.month}-01`), "MMMMM");
          const active = m.month === selected;
          return (
            <button
              key={m.month}
              type="button"
              aria-pressed={active}
              aria-label={strings.monthDetails(formatMonth(m.month, yearFormat))}
              className={cn(
                "flex flex-col items-center gap-1 rounded-md pt-1 pb-0.5",
                active && "bg-muted",
              )}
              onClick={() => onSelect(m.month)}
              data-testid="trend-month"
            >
              <span className="flex items-end gap-0.5" style={{ height: CHART_PX }}>
                <span
                  className="w-1.5 rounded-t-sm bg-emerald-500"
                  style={{ height: barHeight(m.income, max) }}
                />
                <span
                  className="w-1.5 rounded-t-sm bg-red-500"
                  style={{ height: barHeight(m.expense, max) }}
                />
              </span>
              <span className="border-t pt-1 text-[11px] text-muted-foreground">{label}</span>
            </button>
          );
        })}
      </div>

      {picked && (
        <div className="space-y-2 border-t pt-3 text-sm" data-testid="trend-details">
          <div className="flex items-center justify-between">
            <span className="font-medium">{formatMonth(picked.month, yearFormat)}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => onOpenMonth(picked.month)}
            >
              {strings.viewMonth}
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Detail label={strings.income}>
              <Money value={picked.income} kind="income" />
            </Detail>
            <Detail label={strings.expense}>
              <Money value={picked.expense} kind="expense" />
            </Detail>
            <Detail label={strings.net}>
              <Money value={picked.net} kind="net" />
            </Detail>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums">{children}</p>
    </div>
  );
}
