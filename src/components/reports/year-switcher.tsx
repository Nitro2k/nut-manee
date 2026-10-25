"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatYear } from "@/lib/dates";
import { strings } from "@/lib/strings";
import type { YearFormat } from "@/types";

/** ‹ 2026 ›. Tapping the label jumps back to the current year. */
export function YearSwitcher({
  year,
  onChange,
  yearFormat,
}: {
  year: number;
  onChange: (year: number) => void;
  yearFormat: YearFormat;
}) {
  return (
    <div className="flex items-center">
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={strings.previousYear}
        onClick={() => onChange(year - 1)}
      >
        <ChevronLeft className="size-5" />
      </Button>
      <button
        type="button"
        className="h-11 min-w-20 px-1 text-lg font-semibold"
        onClick={() => onChange(new Date().getFullYear())}
      >
        {formatYear(year, yearFormat)}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        aria-label={strings.nextYear}
        onClick={() => onChange(year + 1)}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  );
}
