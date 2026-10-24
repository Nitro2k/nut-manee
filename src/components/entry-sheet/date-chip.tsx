"use client";

import { CalendarDays } from "lucide-react";
import { addDaysStr, formatDayLabel, todayStr } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { DateStr, YearFormat } from "@/types";

interface DateChipProps {
  value: DateStr;
  onChange: (date: DateStr) => void;
  yearFormat: YearFormat;
}

/** Today / Yesterday quick chips plus a native date picker for anything else. */
export function DateChip({ value, onChange, yearFormat }: DateChipProps) {
  const today = todayStr();
  const yesterday = addDaysStr(today, -1);
  const isOther = value !== today && value !== yesterday;

  const chip = "flex h-9 items-center gap-1 rounded-full border px-3 text-sm whitespace-nowrap";
  const active = "border-primary bg-primary text-primary-foreground";

  return (
    <div className="flex gap-1.5">
      <button
        type="button"
        className={cn(chip, value === today && active)}
        onClick={() => onChange(today)}
      >
        {strings.today}
      </button>
      <button
        type="button"
        className={cn(chip, value === yesterday && active)}
        onClick={() => onChange(yesterday)}
      >
        {strings.yesterday}
      </button>
      {/* The native input sits on top (invisible) so iOS opens its own date wheel. */}
      <label className={cn(chip, "relative", isOther && active)}>
        <CalendarDays className="size-4" aria-hidden />
        {isOther ? (
          formatDayLabel(value, yearFormat, today)
        ) : (
          <span className="sr-only">{strings.pickDate}</span>
        )}
        <input
          type="date"
          aria-label={strings.pickDate}
          className="absolute inset-0 opacity-0"
          value={value}
          max="9999-12-31"
          onChange={(e) => e.target.value && onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
