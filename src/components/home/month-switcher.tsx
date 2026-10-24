"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addMonthsStr, formatMonth, todayStr, toMonthStr } from "@/lib/dates";
import { strings } from "@/lib/strings";
import type { MonthStr, YearFormat } from "@/types";

interface MonthSwitcherProps {
  month: MonthStr;
  onChange: (month: MonthStr) => void;
  yearFormat: YearFormat;
}

/** ‹ Oct 2026 ›. Tapping the label jumps back to the current month. */
export function MonthSwitcher({ month, onChange, yearFormat }: MonthSwitcherProps) {
  const current = toMonthStr(todayStr());
  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={strings.previousMonth}
        onClick={() => onChange(addMonthsStr(month, -1))}
      >
        <ChevronLeft className="size-5" />
      </Button>
      <button
        type="button"
        className="h-11 min-w-28 px-1 text-lg font-semibold"
        onClick={() => onChange(current)}
      >
        {formatMonth(month, yearFormat)}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={strings.nextMonth}
        onClick={() => onChange(addMonthsStr(month, 1))}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
