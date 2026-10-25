"use client";

import { ChartPie, House, Menu, Plus, Search, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEntrySheet } from "@/components/entry-sheet/entry-sheet-provider";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: strings.home, icon: House },
  { href: "/reports/", label: strings.reports, icon: ChartPie },
  { href: "/search/", label: strings.search, icon: Search },
  { href: "/more/", label: strings.more, icon: Menu },
];

/** Bottom tab bar: Home · Reports · (+) · Search · More. */
export function TabBar() {
  const pathname = usePathname();
  const { openAdd } = useEntrySheet();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href.replace(/\/$/, ""));

  const tab = ({ href, label, icon: Icon }: (typeof TABS)[number]) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? "page" : undefined}
      className={cn(
        "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] text-muted-foreground",
        isActive(href) && "text-foreground",
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );

  return (
    <nav
      aria-label={strings.mainNavigation}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t bg-background pb-[env(safe-area-inset-bottom)] sm:border-x"
    >
      <div className="flex items-center">
        {TABS.slice(0, 2).map(tab)}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            aria-label={strings.add}
            className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md active:scale-95"
            onClick={() => openAdd()}
          >
            <Plus className="size-6" />
          </button>
        </div>
        {TABS.slice(2).map(tab)}
      </div>
    </nav>
  );
}

/** Bottom padding so content clears the tab bar. */
export const TAB_BAR_SPACE = "pb-[calc(3.5rem+env(safe-area-inset-bottom)+1rem)]";
