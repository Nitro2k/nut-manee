import { toast } from "sonner";
import { buildCsv } from "@/lib/backup/csv";
import { backupFileName, backupToBlob, buildBackup } from "@/lib/backup/export";
import { updateSettings } from "@/lib/repo/settings";
import { saveFile } from "@/lib/save-file";
import { strings } from "@/lib/strings";

/**
 * Full JSON backup. Records `lastBackupAt` unless the user cancels the Share sheet.
 * `quiet`: no success toast (callers inside a drawer show it inline; toasts would cover buttons).
 */
export async function exportBackup({ quiet = false } = {}): Promise<boolean> {
  try {
    const now = new Date();
    const backup = await buildBackup(now);
    const result = await saveFile(backupToBlob(backup), backupFileName("json", now));
    if (result === "cancelled") return false;
    await updateSettings({ lastBackupAt: backup.exportedAt });
    if (!quiet) toast(strings.backupSaved);
    return true;
  } catch (error) {
    console.error(error);
    toast.error(strings.backupFailed);
    return false;
  }
}

/** Spreadsheet export. Not a backup: it can't be restored, so `lastBackupAt` stays. */
export async function exportCsv(): Promise<void> {
  try {
    await saveFile(await buildCsv(), backupFileName("csv"));
  } catch (error) {
    console.error(error);
    toast.error(strings.backupFailed);
  }
}
