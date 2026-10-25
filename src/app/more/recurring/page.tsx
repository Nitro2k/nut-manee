"use client";

import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { CategoryIcon } from "@/components/category-icon";
import { Money } from "@/components/money";
import { PressableRow } from "@/components/pressable-row";
import { RecurringSheet, type RecurringSheetTarget } from "@/components/recurring/recurring-sheet";
import { TAB_BAR_SPACE } from "@/components/tab-bar";
import { Button } from "@/components/ui/button";
import { useCategoryMap, useSettings } from "@/hooks/use-data";
import { formatDate } from "@/lib/dates";
import { nextDueDate } from "@/lib/recurring";
import { listRecurring } from "@/lib/repo/recurring";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { Recurring, YearFormat } from "@/types";

function scheduleLabel(r: Recurring): string {
  if (r.frequency === "monthly") return strings.monthlyOn(r.dayOfMonth);
  // Any year works for "15 Mar"; clamping isn't needed for a label.
  return strings.yearlyOn(
    format(new Date(2026, (r.monthOfYear ?? 1) - 1, 1), `'${r.dayOfMonth}' MMM`),
  );
}

function statusLabel(r: Recurring, yearFormat: YearFormat): string {
  if (!r.active) return strings.paused;
  const next = nextDueDate(r);
  return next ? strings.nextDue(formatDate(next, yearFormat)) : strings.ended;
}

export default function RecurringPage() {
  const items = useLiveQuery(listRecurring);
  const categories = useCategoryMap();
  const settings = useSettings();
  const [sheet, setSheet] = useState<RecurringSheetTarget | null>(null);

  if (!items || !settings) return null;

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
        title={strings.recurring}
        right={
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={strings.addRecurring}
            onClick={() => setSheet({ mode: "add" })}
          >
            <Plus className="size-5" />
          </Button>
        }
      />
      <main className={cn("p-4", TAB_BAR_SPACE)}>
        {items.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-medium">{strings.recurringEmpty}</p>
            <p className="mx-auto max-w-xs text-sm text-muted-foreground">
              {strings.recurringEmptyHint}
            </p>
            <Button className="mt-4 h-11" onClick={() => setSheet({ mode: "add" })}>
              <Plus className="size-4" />
              {strings.addRecurring}
            </Button>
          </div>
        ) : (
          <ul className="divide-y rounded-xl border">
            {items.map((r) => {
              const icon = categories?.get(r.categoryId)?.icon;
              return (
                <li key={r.id}>
                  <PressableRow
                    label={r.name}
                    onPress={() => setSheet({ mode: "edit", recurring: r })}
                    className={cn(
                      "flex min-h-14 items-center gap-3 px-4 py-3 text-sm",
                      !r.active && "text-muted-foreground",
                    )}
                  >
                    {icon && <CategoryIcon name={icon} className={cn(!r.active && "opacity-40")} />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {scheduleLabel(r)} · {statusLabel(r, settings.yearFormat)}
                      </p>
                    </div>
                    <Money value={r.amount} kind={r.type} />
                  </PressableRow>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <RecurringSheet target={sheet} onClose={() => setSheet(null)} />
    </>
  );
}
