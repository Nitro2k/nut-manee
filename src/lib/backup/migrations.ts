import { DB_SCHEMA_VERSION } from "@/lib/db";
import { backupHeaderSchema, backupSchema, type Backup } from "./schema";

/**
 * `migrations[n]` turns the `data` of a version-n file into version n+1. Pure functions over
 * plain JSON. Add one with every `DB_SCHEMA_VERSION` bump (share logic with the Dexie upgrade).
 */
export const migrations: Record<
  number,
  (data: Record<string, unknown>) => Record<string, unknown>
> = {};

export class BackupError extends Error {
  constructor(
    readonly reason: "not-backup" | "too-new" | "invalid",
    message: string,
  ) {
    super(message);
    this.name = "BackupError";
  }
}

/** Parsed JSON of any version → a validated backup at the current schema version. */
export function migrateBackup(json: unknown): Backup {
  const header = backupHeaderSchema.safeParse(json);
  if (!header.success) throw new BackupError("not-backup", "Not a NoMoney backup file");

  const { schemaVersion } = header.data;
  if (schemaVersion > DB_SCHEMA_VERSION) {
    throw new BackupError(
      "too-new",
      `Backup is schema v${schemaVersion}, app is v${DB_SCHEMA_VERSION}`,
    );
  }

  let data = header.data.data;
  for (let version = schemaVersion; version < DB_SCHEMA_VERSION; version++) {
    const migrate = migrations[version];
    if (!migrate) throw new Error(`Missing backup migration from v${version}`);
    data = migrate(data);
  }

  const result = backupSchema.safeParse({
    ...(json as object),
    schemaVersion: DB_SCHEMA_VERSION,
    data,
  });
  if (!result.success) throw new BackupError("invalid", result.error.message);
  return result.data;
}
