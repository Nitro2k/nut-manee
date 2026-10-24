import type { Table, UpdateSpec } from "dexie";
import { nowISO } from "@/lib/dates";
import type { ID, RecordMeta } from "@/types";

type Row = RecordMeta & { id: ID };

/** Fields set by the repo layer, never by callers. */
export type SystemFields = "id" | "createdAt" | "updatedAt" | "deletedAt";

export class NotFoundError extends Error {
  constructor(what: string, id: ID) {
    super(`${what} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

// Every Row has the RecordMeta fields, but TypeScript can't prove that for a generic `T`.
function spec<T extends Row>(changes: object): UpdateSpec<T> {
  return changes as UpdateSpec<T>;
}

export function newId(): ID {
  return crypto.randomUUID();
}

export function newMeta(now = nowISO()): RecordMeta {
  return { createdAt: now, updatedAt: now, deletedAt: null };
}

export function isLive(row: RecordMeta | undefined): boolean {
  return !!row && row.deletedAt === null;
}

/** A row that exists and isn't soft-deleted, else undefined. */
export async function getLive<T extends Row>(table: Table<T, ID>, id: ID): Promise<T | undefined> {
  const row = await table.get(id);
  return isLive(row) ? row : undefined;
}

/** Update a live row and bump `updatedAt`. Throws NotFoundError for missing or deleted rows. */
export async function updateLive<T extends Row>(
  table: Table<T, ID>,
  id: ID,
  changes: Partial<Omit<T, SystemFields>>,
): Promise<void> {
  if (!(await getLive(table, id))) throw new NotFoundError(table.name, id);
  await table.update(id, spec<T>({ ...changes, updatedAt: nowISO() }));
}

/** Soft delete: set `deletedAt`. The row stays as a tombstone for undo and sync. */
export async function softDelete<T extends Row>(table: Table<T, ID>, id: ID): Promise<void> {
  if (!(await getLive(table, id))) throw new NotFoundError(table.name, id);
  const now = nowISO();
  await table.update(id, spec<T>({ deletedAt: now, updatedAt: now }));
}

/** Undo a soft delete. */
export async function restore<T extends Row>(table: Table<T, ID>, id: ID): Promise<void> {
  const row = await table.get(id);
  if (!row) throw new NotFoundError(table.name, id);
  await table.update(id, spec<T>({ deletedAt: null, updatedAt: nowISO() }));
}
