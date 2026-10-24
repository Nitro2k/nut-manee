"use client";

import { useRef, type ReactNode } from "react";
import { Money } from "@/components/money";
import type { Totals } from "@/lib/aggregate";
import { strings } from "@/lib/strings";

const SWIPE_PX = 50;

interface SummaryCardProps {
  totals: Totals;
  /** -1 = previous month, 1 = next month. */
  onSwipe: (direction: -1 | 1) => void;
}

/** Income, expense and net for the month. Swipe left/right to change month. */
export function SummaryCard({ totals, onSwipe }: SummaryCardProps) {
  const startX = useRef<number | null>(null);

  return (
    <section
      className="grid touch-pan-y grid-cols-3 gap-2 rounded-xl border p-4"
      onPointerDown={(e) => (startX.current = e.clientX)}
      onPointerUp={(e) => {
        if (startX.current === null) return;
        const dx = e.clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) >= SWIPE_PX) onSwipe(dx < 0 ? 1 : -1);
      }}
      onPointerCancel={() => (startX.current = null)}
    >
      <Item label={strings.income}>
        <Money value={totals.income} kind="income" />
      </Item>
      <Item label={strings.expense}>
        <Money value={totals.expense} kind="expense" />
      </Item>
      <Item label={strings.net}>
        <Money value={totals.net} kind="net" />
      </Item>
    </section>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{children}</p>
    </div>
  );
}
