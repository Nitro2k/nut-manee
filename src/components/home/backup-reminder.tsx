"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { DatabaseBackup } from "lucide-react";
import { useState } from "react";
import { exportBackup } from "@/components/backup/export-actions";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { isBackupDue, SNOOZE_KEY, SNOOZE_MS } from "@/lib/backup/reminder";
import { formatDateTime, nowISO } from "@/lib/dates";
import { getMeta, setMeta } from "@/lib/repo/meta";
import { SEEDED_KEY } from "@/lib/seed";
import { strings } from "@/lib/strings";
import type { ISODateTime, Settings } from "@/types";

/** Home banner when a backup is due (SPEC §7.1). Hidden until there's at least one entry. */
export function BackupReminder({ settings }: { settings: Settings }) {
  const [busy, setBusy] = useState(false);
  const state = useLiveQuery(async () => {
    const [seededAt, snoozedUntil, hasEntry] = await Promise.all([
      getMeta<ISODateTime>(SEEDED_KEY),
      getMeta<ISODateTime>(SNOOZE_KEY),
      db.transactions.filter((t) => t.deletedAt === null).first(),
    ]);
    return { seededAt, snoozedUntil, hasEntry: !!hasEntry };
  });

  if (!state?.hasEntry || !isBackupDue(settings, state.seededAt, state.snoozedUntil)) return null;

  const backUp = async () => {
    setBusy(true);
    await exportBackup();
    setBusy(false);
  };

  return (
    <div className="flex gap-3 rounded-xl border bg-muted/40 p-3 text-sm" role="status">
      <DatabaseBackup className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="font-medium">{strings.reminderTitle}</p>
        <p className="text-muted-foreground">
          {settings.lastBackupAt
            ? strings.reminderSince(formatDateTime(settings.lastBackupAt, settings.yearFormat))
            : strings.reminderNever}
        </p>
        <div className="mt-2 flex gap-2">
          <Button size="sm" className="h-9" disabled={busy} onClick={backUp}>
            {strings.backUp}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-9"
            onClick={() => void setMeta(SNOOZE_KEY, nowISO(new Date(Date.now() + SNOOZE_MS)))}
          >
            {strings.later}
          </Button>
        </div>
      </div>
    </div>
  );
}
