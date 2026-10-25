"use client";

// REMOVE-AFTER-MIGRATION: one-time import from the old app (SPEC §9.4). Delete once the
// history is imported on the phone, backed up as NoMoney JSON, and the old app is retired.

import { useLiveQuery } from "dexie-react-hooks";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Money } from "@/components/money";
import { useMonth } from "@/components/month-provider";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSettings } from "@/hooks/use-data";
import { db } from "@/lib/db";
import { formatDate, toMonthStr } from "@/lib/dates";
import { commitImport } from "@/lib/import-paotang/commit";
import { buildImportPlan } from "@/lib/import-paotang/preview";
import type { PaotangFile } from "@/lib/import-paotang/schema";
import { strings } from "@/lib/strings";

/** Preview of an old-app import (SPEC §9.3); Import writes it in one transaction. */
export function ImportSheet({ file, onClose }: { file: PaotangFile | null; onClose: () => void }) {
  return (
    <Drawer open={file !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto h-[94dvh] max-w-lg data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[94dvh]">
        {file && <ImportPreview file={file} onDone={onClose} />}
      </DrawerContent>
    </Drawer>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  );
}

function ImportPreview({ file, onDone }: { file: PaotangFile; onDone: () => void }) {
  const settings = useSettings();
  const router = useRouter();
  const { setMonth } = useMonth();
  const switchId = useId();
  const [cleanups, setCleanups] = useState(true);
  const [busy, setBusy] = useState(false);
  // Every row, tombstones too: a deleted imported entry must not come back on re-import.
  const data = useLiveQuery(async () => ({
    categories: await db.categories.toArray(),
    transactions: await db.transactions.toArray(),
  }));

  if (!data || !settings) {
    return <p className="p-6 text-center text-sm text-muted-foreground">{strings.reading}</p>;
  }

  const plan = buildImportPlan(file, data.categories, data.transactions, { cleanups });
  const yearFormat = settings.yearFormat;
  const usedCleanups = plan.cleanups.filter((c) => c.count > 0);
  const toCreate = plan.categories.filter((c) => !c.existing);

  const run = async () => {
    setBusy(true);
    try {
      const result = await commitImport(plan);
      toast(strings.imported(result.imported));
      onDone();
      if (plan.lastDate) setMonth(toMonthStr(plan.lastDate));
      router.push("/");
    } catch (error) {
      console.error(error);
      toast.error(strings.importFailed);
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader>
        <DrawerTitle>{strings.importTitle}</DrawerTitle>
        <DrawerDescription>{strings.importIntro}</DrawerDescription>
      </DrawerHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pb-2 text-sm" data-vaul-no-drag>
        <dl className="divide-y rounded-xl border" data-testid="import-summary">
          <Row label={strings.importDates}>
            {plan.firstDate && plan.lastDate
              ? `${formatDate(plan.firstDate, yearFormat)} – ${formatDate(plan.lastDate, yearFormat)}`
              : "–"}
          </Row>
          <Row label={strings.importEntries}>{plan.counts.toImport.toLocaleString("en-US")}</Row>
          {plan.counts.alreadyImported > 0 && (
            <Row label={strings.importAlready}>
              {plan.counts.alreadyImported.toLocaleString("en-US")}
            </Row>
          )}
          <Row label={strings.importSkipped}>
            {strings.importSkippedDetail(
              plan.counts.deleted,
              plan.counts.zero + plan.counts.invalid,
            )}
          </Row>
          <Row label={strings.income}>
            <Money value={plan.totals.income} kind="income" />
          </Row>
          <Row label={strings.expense}>
            <Money value={plan.totals.expense} kind="expense" />
          </Row>
          <Row label={strings.net}>
            <Money value={plan.totals.net} kind="net" />
          </Row>
        </dl>

        <p
          className="flex items-center gap-2 rounded-xl border px-4 py-3"
          data-testid="balance-check"
        >
          {plan.balance.ok ? (
            <>
              <CircleCheck className="size-5 shrink-0 text-emerald-700" aria-hidden />
              {strings.balanceMatches}
            </>
          ) : (
            <>
              <CircleAlert className="size-5 shrink-0 text-red-700" aria-hidden />
              <span>
                {strings.balanceDiffers}{" "}
                <Money
                  value={Math.abs(plan.balance.fileNet - plan.balance.wallet)}
                  kind="neutral"
                />
              </span>
            </>
          )}
        </p>

        {plan.possibleDuplicates > 0 && (
          <p className="px-1 text-muted-foreground">
            {strings.possibleDuplicates(plan.possibleDuplicates)}
          </p>
        )}

        <section className="rounded-xl border">
          <div className="flex items-start justify-between gap-4 px-4 py-3">
            <div>
              <Label htmlFor={switchId} className="text-base font-normal">
                {strings.cleanupsTitle}
              </Label>
              <p className="text-xs text-muted-foreground">{strings.cleanupsHint}</p>
            </div>
            <Switch id={switchId} checked={cleanups} onCheckedChange={setCleanups} />
          </div>
          {cleanups && usedCleanups.length > 0 && (
            <ul className="space-y-1 border-t px-4 py-3">
              {usedCleanups.map((c) => (
                <li key={c.id} className="flex justify-between gap-4">
                  <span>{c.label}</span>
                  <span className="text-muted-foreground tabular-nums">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {toCreate.length > 0 && (
          <section className="rounded-xl border px-4 py-3">
            <h3 className="mb-1 font-medium">{strings.newCategories}</h3>
            <ul className="text-muted-foreground">
              {toCreate.map((c) => (
                <li key={c.key}>{c.label}</li>
              ))}
            </ul>
          </section>
        )}

        <details className="rounded-xl border">
          <summary className="flex min-h-11 cursor-pointer items-center px-4 font-medium">
            {strings.categoryMapping(plan.mapping.length)}
          </summary>
          <ul className="space-y-1 border-t px-4 py-3">
            {plan.mapping.map((m) => (
              <li key={`${m.type}|${m.oldTitle}`} className="flex gap-2">
                <span className="w-10 shrink-0 text-right text-muted-foreground tabular-nums">
                  {m.count}
                </span>
                <span className="min-w-0 flex-1">
                  {m.oldTitle} → {m.label}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>

      <DrawerFooter className="border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button className="h-11" disabled={busy || plan.counts.toImport === 0} onClick={run}>
          {plan.counts.toImport === 0
            ? strings.nothingToImport
            : strings.importButton(plan.counts.toImport)}
        </Button>
        <Button variant="ghost" className="h-11" disabled={busy} onClick={onDone}>
          {strings.cancel}
        </Button>
      </DrawerFooter>
    </div>
  );
}
