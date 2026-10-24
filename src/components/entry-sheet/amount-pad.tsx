"use client";

import { Delete } from "lucide-react";
import { useRef, type ReactNode } from "react";
import type { CalcKey } from "@/lib/calc";
import { cn } from "@/lib/utils";

const LONG_PRESS_MS = 500;

const KEYS: (CalcKey | "primary")[] = [
  "7", "8", "9", "back",
  "4", "5", "6", "-",
  "1", "2", "3", "+",
  ".", "0", "primary",
]; // prettier-ignore

const LABEL: Partial<Record<CalcKey, ReactNode>> = {
  "-": "−",
  back: <Delete className="size-6" aria-label="Backspace" />,
};

interface AmountPadProps {
  onKey: (key: CalcKey) => void;
  /** "=" while an expression is pending, otherwise "Save". */
  primaryLabel: string;
  primaryDisabled: boolean;
  onPrimary: () => void;
  /** Long-press on Save (only when not resolving "="). */
  onPrimaryLongPress?: () => void;
}

/** Calculator pad (plain buttons, so the iOS keyboard never opens for the amount). */
export function AmountPad({
  onKey,
  primaryLabel,
  primaryDisabled,
  onPrimary,
  onPrimaryLongPress,
}: AmountPadProps) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressed = useRef(false);

  const startPress = () => {
    longPressed.current = false;
    if (!onPrimaryLongPress || primaryDisabled) return;
    timer.current = setTimeout(() => {
      longPressed.current = true;
      onPrimaryLongPress();
    }, LONG_PRESS_MS);
  };
  const endPress = () => clearTimeout(timer.current);

  return (
    <div className="grid grid-cols-4 gap-px border-t bg-border">
      {KEYS.map((key) =>
        key === "primary" ? (
          <button
            key={key}
            type="button"
            disabled={primaryDisabled}
            className="col-span-2 h-14 bg-primary text-lg font-semibold text-primary-foreground select-none [-webkit-touch-callout:none] disabled:opacity-40"
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            onContextMenu={(e) => e.preventDefault()}
            onClick={() => {
              if (!longPressed.current) onPrimary();
            }}
          >
            {primaryLabel}
          </button>
        ) : (
          <button
            key={key}
            type="button"
            className={cn(
              "flex h-14 items-center justify-center bg-background text-2xl select-none active:bg-muted",
              (key === "+" || key === "-" || key === "back") && "bg-muted/50",
            )}
            onClick={() => onKey(key)}
          >
            {LABEL[key] ?? key}
          </button>
        ),
      )}
    </div>
  );
}
