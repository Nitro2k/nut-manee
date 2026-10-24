"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useSettings } from "@/hooks/use-data";
import { mergeBackup, replaceWithBackup, summarizeBackup } from "@/lib/backup/import";
import type { Backup } from "@/lib/backup/schema";
import { formatDate, formatDateTime } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { exportBackup } from "./export-actions";

/** Shows what's in a picked backup, then merges it or (after a confirm step) replaces all data. */
export function RestoreSheet({ backup, onClose }: { backup: Backup | null; onClose: () => void }) {
  return (
    <Drawer open={backup !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-w-lg">
        {backup && <RestoreForm backup={backup} onDone={onClose} />}
      </DrawerContent>
    </Drawer>
  );
}

function RestoreForm({ backup, onDone }: { backup: Backup; onDone: () => void }) {
  const settings = useSettings();
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const [busy, setBusy] = useState(false);
  const [backedUp, setBackedUp] = useState(false);
  const summary = summarizeBackup(backup);
  const yearFormat = settings?.yearFormat ?? "CE";

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    try {
      toast(await action());
      onDone();
    } catch (error) {
      console.error(error);
      toast.error(strings.restoreFailed);
    } finally {
      setBusy(false);
    }
  };

  const merge = () =>
    run(async () => {
      const { added, updated } = await mergeBackup(backup);
      return strings.restoreMerged(added, updated);
    });

  const replace = () =>
    run(async () => {
      await replaceWithBackup(backup);
      return strings.restoreReplaced;
    });

  if (step === "confirm") {
    return (
      <>
        <DrawerHeader>
          <DrawerTitle>{strings.replaceTitle}</DrawerTitle>
          <DrawerDescription>{strings.replaceBody}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <Button
            variant="outline"
            className="h-11"
            disabled={busy || backedUp}
            onClick={async () => setBackedUp(await exportBackup({ quiet: true }))}
          >
            {backedUp ? strings.backedUp : strings.backUpCurrentFirst}
          </Button>
          <Button variant="destructive" className="h-11" disabled={busy} onClick={replace}>
            {strings.replaceConfirm}
          </Button>
          <Button
            variant="ghost"
            className="h-11"
            disabled={busy}
            onClick={() => setStep("choose")}
          >
            {strings.cancel}
          </Button>
        </DrawerFooter>
      </>
    );
  }

  const first = summary.firstDate && formatDate(summary.firstDate, yearFormat);
  const last = summary.lastDate && formatDate(summary.lastDate, yearFormat);
  const range = !first || !last ? "–" : first === last ? first : `${first} – ${last}`;

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{strings.restoreTitle}</DrawerTitle>
        <DrawerDescription>
          {strings.restoreFrom(formatDateTime(summary.exportedAt, yearFormat))}
        </DrawerDescription>
      </DrawerHeader>
      <dl className="mx-4 divide-y rounded-xl border text-sm">
        <SummaryRow
          label={strings.restoreEntries}
          value={summary.entries.toLocaleString("en-US")}
        />
        <SummaryRow label={strings.restoreCategories} value={String(summary.categories)} />
        <SummaryRow label={strings.restoreRange} value={range} />
      </dl>
      <DrawerFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button className="h-11" disabled={busy} onClick={merge}>
          {strings.merge}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{strings.mergeHint}</p>
        <Button
          variant="outline"
          className="mt-2 h-11 text-destructive"
          disabled={busy}
          onClick={() => setStep("confirm")}
        >
          {strings.replace}
        </Button>
        <p className="text-center text-xs text-muted-foreground">{strings.replaceHint}</p>
      </DrawerFooter>
    </>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
