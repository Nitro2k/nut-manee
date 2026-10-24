import { format } from "date-fns";
import { db, DB_SCHEMA_VERSION } from "@/lib/db";
import { nowISO } from "@/lib/dates";
import { getSettings } from "@/lib/repo/settings";
import { APP_VERSION } from "@/lib/version";
import { BACKUP_APP, BACKUP_KIND, type Backup } from "./schema";

/**
 * Every row of every user table, tombstones included (merge and Phase 2 sync need them).
 * `meta` (device-only flags like `seededAt`) is not part of a backup.
 */
export async function buildBackup(now = new Date()): Promise<Backup> {
  const data = await db.transaction(
    "r",
    [
      db.transactions,
      db.categories,
      db.accounts,
      db.budgets,
      db.recurring,
      db.templates,
      db.settings,
    ],
    async () => ({
      transactions: await db.transactions.toArray(),
      categories: await db.categories.toArray(),
      accounts: await db.accounts.toArray(),
      budgets: await db.budgets.toArray(),
      recurring: await db.recurring.toArray(),
      templates: await db.templates.toArray(),
      settings: await getSettings(),
    }),
  );
  return {
    app: BACKUP_APP,
    kind: BACKUP_KIND,
    schemaVersion: DB_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: nowISO(now),
    data,
  };
}

/** "nomoney-backup-2026-10-25-1405.json" (wall-clock, sorts by time in Files). */
export function backupFileName(ext: "json" | "csv", now = new Date()): string {
  const kind = ext === "json" ? "backup" : "entries";
  return `nomoney-${kind}-${format(now, "yyyy-MM-dd-HHmm")}.${ext}`;
}

export function backupToBlob(backup: Backup): Blob {
  return new Blob([JSON.stringify(backup)], { type: "application/json" });
}
