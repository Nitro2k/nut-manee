import type { BudgetLevel } from "@/lib/budget";
import { cn } from "@/lib/utils";

/** Bar color by level: neutral until 80%, amber at 80%, red at 100% (SPEC §7.1). */
export const LEVEL_TEXT: Record<BudgetLevel, string> = {
  ok: "text-muted-foreground",
  warn: "text-amber-600",
  over: "text-red-600",
};

const LEVEL_BAR: Record<BudgetLevel, string> = {
  ok: "bg-primary",
  warn: "bg-amber-500",
  over: "bg-red-600",
};

/** Progress bar; safe to show while amounts are hidden (it only reveals a percentage). */
export function BudgetBar({ percent, level }: { percent: number; level: BudgetLevel }) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.min(percent, 100)}
    >
      <div
        className={cn("h-full rounded-full", LEVEL_BAR[level])}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}
