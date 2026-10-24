import type { ReactNode } from "react";

/** Sticky top bar that respects the iOS safe area. */
export function AppHeader({
  left,
  title,
  right,
}: {
  left?: ReactNode;
  title: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 items-center gap-1 px-2">
        {left}
        <h1 className="flex-1 truncate px-2 text-lg font-semibold">{title}</h1>
        {right}
      </div>
    </header>
  );
}
