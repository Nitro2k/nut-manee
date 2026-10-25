import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A tappable row that can contain its own controls (tap-to-reveal <Money>) without nesting
 * interactive elements, which screen readers handle badly: a full-size button sits behind
 * the content, the content lets taps through, and only its own controls take them
 * (<Money> opts back in with `pointer-events-auto`). Without `onPress` it's a plain row.
 */
export function PressableRow({
  label,
  onPress,
  expanded,
  className,
  children,
  testId,
}: {
  /** Accessible name of the row button; keep amounts out of it (privacy). */
  label: string;
  onPress?: () => void;
  expanded?: boolean;
  /** Layout classes for the content. */
  className?: string;
  children: ReactNode;
  testId?: string;
}) {
  if (!onPress) {
    return (
      <div className={className} data-testid={testId}>
        {children}
      </div>
    );
  }
  return (
    <div className="relative" data-testid={testId}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={expanded}
        className="absolute inset-0 w-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset active:bg-muted"
        onClick={onPress}
      />
      <div className={cn("pointer-events-none relative", className)}>{children}</div>
    </div>
  );
}
