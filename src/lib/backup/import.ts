import type { Table } from "dexie";
import { db } from "@/lib/db";
import type { DateStr, ISODateTime } from "@/types";
import { BackupError, migrateBackup } from "./migrations";
import type { Backup, BackupData } from "./schema";

export interface BackupSummary {
  exportedAt: ISODateTime;
  appVersion: string;
  /** Live (not deleted) entries. */
  entries: number;
  categories: number;
  firstDate: DateStr | null;
  lastDate: DateStr | null;
}

/** Read and validate a picked file. Throws BackupError with a user-facing reason. */
export async function readBackupFile(file: Blob): Promise<Backup> {
  let json: unknown;
  try {
    json = JSON.parse(await file.text());
  } catch {
    throw new BackupError("not-backup", "File is not JSON");
  }
  return migrateBackup(json);
}

export function summarizeBackup(backup: Backup): BackupSummary {
  const live = backup.data.transactions.filter((t) => t.deletedAt === null);
  const dates = live.map((t) => t.date).sort();
  return {
    exportedAt: backup.exportedAt,
    appVersion: backup.appVersion,
    entries: live.length,
    categories: backup.data.categories.filter((c) => c.deletedAt === null).length,
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
  };
}

type ListTable = Exclude<keyof BackupData, "settings">;
const LIST_TABLES: ListTable[] = [
  "transactions",
  "categories",
  "accounts",
  "budgets",
  "recurring",
  "templates",
];

function tableOf(name: ListTable): Table<{ id: string; updatedAt: string }, string> {
  return db[name] as unknown as Table<{ id: string; updatedAt: string }, string>;
}

const allTables = () => [...LIST_TABLES.map(tableOf), db.settings];

/** Wipe every user table and load the backup exactly. `meta` (device flags) is kept. */
export async function replaceWithBackup(backup: Backup): Promise<void> {
  await db.transaction("rw", allTables(), async () => {
    for (const name of LIST_TABLES) {
      const table = tableOf(name);
      await table.clear();
      await table.bulkAdd(backup.data[name]);
    }
    await db.settings.clear();
    await db.settings.add(backup.data.settings);
  });
}

export interface MergeResult {
  added: number;
  updated: number;
}

/** Timestamps may carry different offsets, so compare instants, not strings. */
const isNewer = (a: ISODateTime, b: ISODateTime) => Date.parse(a) > Date.parse(b);

/**
 * Merge by `id`: add rows this device doesn't have, overwrite rows where the backup's
 * `updatedAt` is newer (tombstones included, so deletes carry over). Never deletes.
 */
export async function mergeBackup(backup: Backup): Promise<MergeResult> {
  const result: MergeResult = { added: 0, updated: 0 };
  await db.transaction("rw", allTables(), async () => {
    for (const name of LIST_TABLES) {
      const table = tableOf(name);
      const incoming = backup.data[name];
      const existing = await table.bulkGet(incoming.map((row) => row.id));
      const toPut = incoming.filter((row, i) => {
        const current = existing[i];
        if (!current) result.added++;
        else if (isNewer(row.updatedAt, current.updatedAt)) result.updated++;
        else return false;
        return true;
      });
      await table.bulkPut(toPut);
    }

    const current = await db.settings.get(backup.data.settings.id);
    if (!current || isNewer(backup.data.settings.updatedAt, current.updatedAt)) {
      // Keep the most recent backup date either side knows about.
      const lastBackupAt = [current?.lastBackupAt, backup.data.settings.lastBackupAt]
        .filter((d): d is string => !!d)
        .sort((a, b) => Date.parse(b) - Date.parse(a))[0];
      await db.settings.put({ ...backup.data.settings, lastBackupAt: lastBackupAt ?? null });
    }
  });
  return result;
}
