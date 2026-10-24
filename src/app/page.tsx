"use client";

import { AppHeader } from "@/components/app-header";
import { Money } from "@/components/money";
import { PrivacyMenu } from "@/components/privacy-menu";
import { strings } from "@/lib/strings";

// Placeholder Home until P3: demo amounts to try privacy masking.
const DEMO = { income: 45_000_00, expense: 12_345_50, balance: 82_551_47 };

export default function Home() {
  return (
    <>
      <AppHeader title={strings.appName} right={<PrivacyMenu />} />
      <main className="space-y-4 p-4">
        <section className="grid grid-cols-3 gap-2 rounded-xl border p-4">
          <SummaryItem label={strings.income}>
            <Money value={DEMO.income} kind="income" />
          </SummaryItem>
          <SummaryItem label={strings.expense}>
            <Money value={DEMO.expense} kind="expense" />
          </SummaryItem>
          <SummaryItem label={strings.net}>
            <Money value={DEMO.income - DEMO.expense} kind="net" />
          </SummaryItem>
        </section>
        <section className="flex items-center justify-between rounded-xl border p-4">
          <span className="text-sm text-muted-foreground">{strings.balance}</span>
          <Money value={DEMO.balance} kind="balance" className="text-lg font-semibold" />
        </section>
      </main>
    </>
  );
}

function SummaryItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{children}</p>
    </div>
  );
}
