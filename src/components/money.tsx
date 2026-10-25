"use client";

import { useState, type KeyboardEvent, type MouseEvent } from "react";
import { usePrivacy } from "@/components/privacy-provider";
import { formatBaht } from "@/lib/money";
import type { MoneyKind } from "@/lib/privacy";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { Satang } from "@/types";

const MASK = "฿ ••••";

const COLOR: Record<MoneyKind, string> = {
  income: "text-emerald-700",
  expense: "text-red-600",
  net: "",
  balance: "",
  neutral: "",
};

interface MoneyProps {
  value: Satang;
  kind: MoneyKind;
  className?: string;
  /** Skip masking. Only for the entry sheet, where digits stay visible while typing (SPEC §6). */
  unmasked?: boolean;
}

/** The only way to display an amount. Masked per privacy settings; tap to reveal, tap again to hide. */
export function Money({ value, kind, className, unmasked = false }: MoneyProps) {
  const { isMasked, hideEpoch } = usePrivacy();
  // Remember which hide-epoch the reveal belongs to, so going to the background hides it again.
  const [revealedEpoch, setRevealedEpoch] = useState<number | null>(null);

  const masked = !unmasked && isMasked(kind);
  const revealed = revealedEpoch === hideEpoch;
  const showMask = masked && !revealed;
  const text = showMask ? MASK : formatBaht(value);

  if (!masked) {
    return (
      <span className={cn("whitespace-nowrap tabular-nums", COLOR[kind], className)}>{text}</span>
    );
  }

  const toggle = (e: MouseEvent | KeyboardEvent) => {
    e.stopPropagation(); // don't trigger a tappable row around the amount
    setRevealedEpoch(revealed ? null : hideEpoch);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-pressed={revealed}
      aria-label={showMask ? strings.hiddenAmount : undefined}
      className={cn(
        // pointer-events-auto: still tappable inside a PressableRow (which passes taps through).
        "pointer-events-auto cursor-pointer whitespace-nowrap tabular-nums select-none [-webkit-touch-callout:none]",
        COLOR[kind],
        className,
      )}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle(e);
        }
      }}
    >
      {text}
    </span>
  );
}
