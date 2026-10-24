/** UUID from `crypto.randomUUID()`. */
export type ID = string;

/** ISO-8601 timestamp with offset and milliseconds, e.g. `2026-10-24T09:05:00.000+07:00`. */
export type ISODateTime = string;

/** Wall-clock calendar date `YYYY-MM-DD` (Asia/Bangkok). No timezone conversion. */
export type DateStr = string;

/** Wall-clock time `HH:mm`. */
export type TimeStr = string;

/** Calendar month `YYYY-MM`. */
export type MonthStr = string;

export type EntryType = "income" | "expense";

/** Fields every user record carries, for soft delete and Phase 2 sync. */
export interface RecordMeta {
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
}
