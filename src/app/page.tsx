"use client";

import { AppHeader } from "@/components/app-header";
import { BackupReminder } from "@/components/home/backup-reminder";
import { EntryList } from "@/components/home/entry-list";
import { InstallHint } from "@/components/home/install-hint";
import { MonthSwitcher } from "@/components/home/month-switcher";
import { SummaryCard } from "@/components/home/summary-card";
import { useMonth } from "@/components/month-provider";
import { PrivacyMenu } from "@/components/privacy-menu";
import { TAB_BAR_SPACE } from "@/components/tab-bar";
import { useCategoryMap, useMonthTransactions, useSettings } from "@/hooks/use-data";
import { totals } from "@/lib/aggregate";
import { addMonthsStr } from "@/lib/dates";
import { strings } from "@/lib/strings";

export default function Home() {
  const { month, setMonth } = useMonth();
  const settings = useSettings();
  const transactions = useMonthTransactions(month);
  const categories = useCategoryMap();

  if (!settings) return null;

  return (
    <>
      <AppHeader
        title={<MonthSwitcher month={month} onChange={setMonth} yearFormat={settings.yearFormat} />}
        right={<PrivacyMenu />}
      />
      <main className={TAB_BAR_SPACE}>
        <div className="space-y-3 p-4">
          <InstallHint />
          <BackupReminder settings={settings} />
          <SummaryCard
            totals={totals(transactions ?? [])}
            onSwipe={(direction) => setMonth(addMonthsStr(month, direction))}
          />
        </div>
        {transactions && categories && transactions.length > 0 && (
          <EntryList
            transactions={transactions}
            categories={categories}
            yearFormat={settings.yearFormat}
          />
        )}
        {transactions?.length === 0 && (
          <div className="px-4 py-16 text-center">
            <p className="font-medium">{strings.noEntries}</p>
            <p className="text-sm text-muted-foreground">{strings.noEntriesHint}</p>
          </div>
        )}
      </main>
    </>
  );
}
