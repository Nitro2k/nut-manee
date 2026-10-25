"use client";

import {
  ChevronRight,
  DatabaseBackup,
  PiggyBank,
  Repeat,
  Shapes,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { PrivacySwitches } from "@/components/privacy-menu";
import { TAB_BAR_SPACE } from "@/components/tab-bar";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-data";
import { DB_SCHEMA_VERSION } from "@/lib/db";
import { formatYear } from "@/lib/dates";
import { updateSettings } from "@/lib/repo/settings";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/version";
import type { YearFormat } from "@/types";

const LINKS: { href: string; label: string; Icon: LucideIcon }[] = [
  { href: "/more/categories/", label: strings.categories, Icon: Shapes },
  { href: "/more/recurring/", label: strings.recurring, Icon: Repeat },
  { href: "/more/budgets/", label: strings.budgets, Icon: PiggyBank },
  { href: "/more/backup/", label: strings.backupAndData, Icon: DatabaseBackup },
];

const YEAR_FORMATS: YearFormat[] = ["CE", "BE"];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="rounded-xl border px-4 py-3">{children}</div>
    </section>
  );
}

/**
 * Ask the service worker to look for a new version. sw-register shows "Update available ·
 * Reload" once it's downloaded, so a ready update needs no message here (null).
 */
async function checkForUpdate(): Promise<string | null> {
  const registration = await navigator.serviceWorker?.getRegistration();
  if (!registration) return strings.updateUnavailable;
  try {
    await registration.update();
  } catch {
    return strings.updateUnavailable; // offline
  }
  if (registration.waiting) return null;
  return registration.installing ? strings.updateDownloading : strings.upToDate;
}

export default function MorePage() {
  const settings = useSettings();
  const [checking, setChecking] = useState(false);

  if (!settings) return null;
  const thisYear = new Date().getFullYear();

  const check = async () => {
    setChecking(true);
    const message = await checkForUpdate();
    if (message) toast(message);
    setChecking(false);
  };

  return (
    <>
      <AppHeader title={strings.more} />
      <main className={cn("space-y-6 p-4", TAB_BAR_SPACE)}>
        <nav className="divide-y rounded-xl border">
          {LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-11 items-center gap-3 px-4 py-3 text-sm"
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="flex-1">{label}</span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          ))}
        </nav>

        <Section title={strings.privacy}>
          <PrivacySwitches idPrefix="more" />
        </Section>

        <Section title={strings.display}>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <span>{strings.yearFormat}</span>
            <div
              className="flex rounded-full bg-muted p-1"
              role="radiogroup"
              aria-label={strings.yearFormat}
            >
              {YEAR_FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  role="radio"
                  aria-checked={settings.yearFormat === format}
                  className={cn(
                    "h-9 rounded-full px-3 text-sm font-medium",
                    settings.yearFormat === format && "bg-background shadow-sm",
                  )}
                  onClick={() => void updateSettings({ yearFormat: format })}
                >
                  {(format === "CE" ? strings.yearCE : strings.yearBE)(
                    formatYear(thisYear, format),
                  )}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title={strings.about}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>{strings.appVersion}</dt>
              <dd className="tabular-nums">{APP_VERSION}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{strings.dataVersion}</dt>
              <dd className="tabular-nums">{DB_SCHEMA_VERSION}</dd>
            </div>
          </dl>
          <Button
            variant="outline"
            className="mt-3 h-11 w-full"
            disabled={checking}
            onClick={() => void check()}
          >
            {checking ? strings.checking : strings.checkForUpdate}
          </Button>
        </Section>
      </main>
    </>
  );
}
