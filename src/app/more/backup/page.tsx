"use client";

import { ChevronLeft, Download, FileSpreadsheet, History, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { exportBackup, exportCsv } from "@/components/backup/export-actions";
import { RestoreSheet } from "@/components/backup/restore-sheet";
import { ImportSheet } from "@/components/import/import-sheet";
import { StorageCard } from "@/components/more/storage-card";
import { TAB_BAR_SPACE } from "@/components/tab-bar";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/hooks/use-data";
import { readBackupFile } from "@/lib/backup/import";
import { BackupError } from "@/lib/backup/migrations";
import type { Backup } from "@/lib/backup/schema";
import { formatDateTime } from "@/lib/dates";
import { PaotangError, parsePaotang, type PaotangFile } from "@/lib/import-paotang/schema";
import { updateSettings } from "@/lib/repo/settings";
import { strings } from "@/lib/strings";

const REMINDER_DAYS = [0, 7, 14, 30];

const ERROR_MESSAGES: Record<BackupError["reason"], string> = {
  "not-backup": strings.errorNotBackup,
  "too-new": strings.errorTooNew,
  invalid: strings.errorInvalid,
};

export default function BackupPage() {
  const settings = useSettings();
  const fileInput = useRef<HTMLInputElement>(null);
  const oldAppInput = useRef<HTMLInputElement>(null);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [oldApp, setOldApp] = useState<PaotangFile | null>(null);
  const [busy, setBusy] = useState(false);

  const busyWhile = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setBackup(await readBackupFile(file));
    } catch (error) {
      if (!(error instanceof BackupError)) console.error(error);
      toast.error(
        error instanceof BackupError ? ERROR_MESSAGES[error.reason] : strings.errorInvalid,
      );
    }
  };

  const onOldAppFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      setOldApp(parsePaotang(await file.text()));
    } catch (error) {
      if (!(error instanceof PaotangError)) console.error(error);
      toast.error(
        error instanceof PaotangError && error.reason === "invalid"
          ? strings.importInvalid(error.message)
          : strings.importNotJson,
      );
    }
  };

  if (!settings) return null;

  return (
    <>
      <AppHeader
        left={
          <Button variant="ghost" size="icon" className="size-11" aria-label={strings.back} asChild>
            <Link href="/more/">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
        }
        title={strings.backupAndData}
      />
      <main className={`space-y-4 p-4 ${TAB_BAR_SPACE}`}>
        <p className="text-sm text-muted-foreground">{strings.backupIntro}</p>

        <section className="divide-y rounded-xl border text-sm">
          <div className="flex items-baseline justify-between gap-4 px-4 py-3">
            <span>{strings.lastBackup}</span>
            <span className="text-right tabular-nums" data-testid="last-backup">
              {settings.lastBackupAt
                ? formatDateTime(settings.lastBackupAt, settings.yearFormat)
                : strings.never}
            </span>
          </div>
          <label className="flex min-h-11 items-center justify-between gap-4 px-4 py-2">
            <span>{strings.backupReminder}</span>
            <select
              className="h-9 rounded-md bg-transparent text-right text-base"
              value={settings.backupReminderDays}
              onChange={(e) => void updateSettings({ backupReminderDays: Number(e.target.value) })}
            >
              {REMINDER_DAYS.map((days) => (
                <option key={days} value={days}>
                  {days === 0 ? strings.reminderOff : strings.reminderEvery(days)}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="divide-y rounded-xl border">
          <ActionRow
            icon={<Download />}
            label={strings.backUpNow}
            hint={strings.backUpNowHint}
            disabled={busy}
            onClick={() => void busyWhile(exportBackup)}
          />
          <ActionRow
            icon={<FileSpreadsheet />}
            label={strings.exportCsv}
            hint={strings.exportCsvHint}
            disabled={busy}
            onClick={() => void busyWhile(exportCsv)}
          />
          <ActionRow
            icon={<Upload />}
            label={strings.restoreBackup}
            hint={strings.restoreBackupHint}
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          />
          <ActionRow
            icon={<History />}
            label={strings.importOld}
            hint={strings.importOldHint}
            disabled={busy}
            onClick={() => oldAppInput.current?.click()}
          />
        </section>
        {/* No `accept`: iOS doesn't know the .paotang type and would grey the file out. */}
        <input
          ref={oldAppInput}
          type="file"
          className="hidden"
          data-testid="old-app-input"
          onChange={(e) => {
            void onOldAppFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          data-testid="restore-input"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = ""; // picking the same file again still fires change
          }}
        />

        <StorageCard />
      </main>
      <RestoreSheet backup={backup} onClose={() => setBackup(null)} />
      <ImportSheet file={oldApp} onClose={() => setOldApp(null)} />
    </>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  disabled,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  hint: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-50 [&_svg]:size-5 [&_svg]:shrink-0"
      disabled={disabled}
      onClick={onClick}
    >
      {icon}
      <span className="flex-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
