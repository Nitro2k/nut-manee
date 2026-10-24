"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryIcon } from "@/components/category-icon";
import { useEntrySheet } from "@/components/entry-sheet/entry-sheet-provider";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import { useCategoryMap } from "@/hooks/use-data";
import { formatDayLabel, todayStr } from "@/lib/dates";
import { duePeriods, type DuePeriod } from "@/lib/recurring";
import { addDueEntry, listRecurring, skipAllDue, skipDue } from "@/lib/repo/recurring";
import { strings } from "@/lib/strings";
import type { Recurring, YearFormat } from "@/types";

/**
 * One card per recurring item with something due (SPEC §7.1): its oldest unhandled period,
 * plus how many more are waiting. Nothing is added until the user taps.
 */
export function DueRecurring({ yearFormat }: { yearFormat: YearFormat }) {
  const items = useLiveQuery(listRecurring);
  const today = todayStr();

  const due = (items ?? [])
    .filter((r) => r.active)
    .map((recurring) => ({ recurring, periods: duePeriods(recurring, today) }))
    .filter(({ periods }) => periods.length > 0);

  if (due.length === 0) return null;
  return (
    <div className="space-y-2">
      {due.map(({ recurring, periods }) => (
        <DueCard
          key={recurring.id}
          recurring={recurring}
          periods={periods}
          today={today}
          yearFormat={yearFormat}
        />
      ))}
    </div>
  );
}

function DueCard({
  recurring,
  periods,
  today,
  yearFormat,
}: {
  recurring: Recurring;
  periods: DuePeriod[];
  today: string;
  yearFormat: YearFormat;
}) {
  const { openDue } = useEntrySheet();
  const categories = useCategoryMap();
  const [busy, setBusy] = useState(false);
  const [first] = periods;
  if (!first) return null;
  const category = categories?.get(recurring.categoryId);

  const act = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      toast(message);
    } catch (error) {
      console.error(error);
      toast.error(String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border p-3 text-sm" data-testid="due-card">
      <div className="flex items-center gap-3">
        {category && <CategoryIcon name={category.icon} />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{recurring.name}</p>
          <p className="text-muted-foreground">
            {strings.dueOn(formatDayLabel(first.date, yearFormat, today))}
            {periods.length > 1 && ` · ${strings.moreDue(periods.length - 1)}`}
          </p>
        </div>
        <Money value={recurring.amount} kind={recurring.type} className="font-medium" />
      </div>
      <div className="mt-2 flex flex-wrap gap-2 pl-8">
        <Button
          size="sm"
          className="h-9"
          disabled={busy}
          onClick={() => act(() => addDueEntry(recurring.id, first.period), strings.added)}
        >
          {strings.add}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          disabled={busy}
          onClick={() => openDue(recurring, first)}
        >
          {strings.edit}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9"
          disabled={busy}
          onClick={() => act(() => skipDue(recurring.id, first.period), strings.skipped)}
        >
          {strings.skip}
        </Button>
        {periods.length > 1 && (
          <Button
            size="sm"
            variant="ghost"
            className="h-9"
            disabled={busy}
            onClick={() => act(() => skipAllDue(recurring.id, today), strings.skipped)}
          >
            {strings.skipAll}
          </Button>
        )}
      </div>
    </div>
  );
}
