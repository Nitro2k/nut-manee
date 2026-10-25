"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { Money } from "@/components/money";
import { PressableRow } from "@/components/pressable-row";
import type { ParentTotal } from "@/lib/report";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { EntryType } from "@/types";

/** Bar color by type: the only color in the chart (one hue, SPEC: color = income/expense). */
const BAR: Record<EntryType, string> = { expense: "bg-red-500", income: "bg-emerald-500" };

/** Whole percent for labels; "<1%" / ">99%" so a slice never reads as 0% or the whole. */
export function percentLabel(percent: number): string {
  if (percent > 0 && percent < 1) return "<1%";
  if (percent > 99 && percent < 100) return ">99%";
  return `${Math.round(percent)}%`;
}

/**
 * Ranked share of each parent category (a bar list instead of a donut: ~13 parents is too
 * many slices). Tap a row for its subcategory breakdown. Bars and % are safe while amounts
 * are hidden; amounts go through <Money>.
 */
export function CategoryBars({ totals, type }: { totals: ParentTotal[]; type: EntryType }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <ul className="divide-y rounded-xl border">
      {totals.map((p) => {
        const expanded = open === p.category.id;
        const canExpand = p.children.length > 0;
        const toggle = () => setOpen(expanded ? null : p.category.id);
        return (
          <li key={p.category.id}>
            <PressableRow
              label={strings.showDetails(p.category.name)}
              onPress={canExpand ? toggle : undefined}
              expanded={canExpand ? expanded : undefined}
              className="space-y-1.5 px-4 py-3 text-sm"
              testId="category-bar"
            >
              <div className="flex items-center gap-3">
                <CategoryIcon name={p.category.icon} />
                <span className="min-w-0 flex-1 truncate font-medium">{p.category.name}</span>
                <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                  {percentLabel(p.percent)}
                </span>
                <Money value={p.amount} kind={type} className="tabular-nums" />
                <ChevronDown
                  className={cn(
                    "size-4 text-muted-foreground transition-transform",
                    !canExpand && "invisible",
                    expanded && "rotate-180",
                  )}
                  aria-hidden
                />
              </div>
              <div className="ml-8 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", BAR[type])}
                  style={{ width: `${Math.max(p.percent, 1)}%` }}
                />
              </div>
            </PressableRow>
            {expanded && (
              <ul className="space-y-2 bg-muted/40 py-2 pr-11 pl-12 text-sm">
                {p.children.map((c) => (
                  <li key={c.category?.id ?? "general"} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate">
                      {c.category?.name ?? strings.general}
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {percentLabel(p.amount > 0 ? (c.amount * 100) / p.amount : 0)}
                    </span>
                    <Money value={c.amount} kind={type} className="tabular-nums" />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
