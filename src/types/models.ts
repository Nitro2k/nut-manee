import type { DateStr, EntryType, ID, ISODateTime, RecordMeta, TimeStr } from "./common";
import type { Satang } from "./money";

export interface Transaction extends RecordMeta {
  id: ID;
  type: EntryType;
  /** Always > 0. */
  amount: Satang;
  /** Parent or child category. */
  categoryId: ID;
  /** v1: always the default "Cash" account. */
  accountId: ID;
  date: DateStr;
  time: TimeStr;
  /** May be ''. Thai allowed. */
  note: string;
  origin: "manual" | "template" | "recurring" | "import";
  recurringId: ID | null;
  /** Old app's transaction id, for idempotent re-import. */
  importRef: string | null;
}

export interface Category extends RecordMeta {
  id: ID;
  type: EntryType;
  name: string;
  /** Max depth 2: a child's parent must have `parentId === null`. */
  parentId: ID | null;
  /** Lucide icon name (kebab-case). */
  icon: string;
  order: number;
  /** Hidden from pickers, kept for history. */
  archived: boolean;
  /** Stable key the importer and reports rely on, e.g. `cashback`, `other-expense`. */
  systemKey: string | null;
}

export interface Account extends RecordMeta {
  id: ID;
  name: string;
  kind: "cash" | "bank" | "credit";
  currency: "THB";
  order: number;
  archived: boolean;
}

/** Parent expense categories only. */
export interface Budget extends RecordMeta {
  id: ID;
  categoryId: ID;
  /** null = "No limit". */
  monthlyLimit: Satang | null;
}

export interface Recurring extends RecordMeta {
  id: ID;
  name: string;
  type: EntryType;
  amount: Satang;
  categoryId: ID;
  accountId: ID;
  note: string;
  frequency: "monthly" | "yearly";
  /** 1–31; clamped to the last day of short months. */
  dayOfMonth: number;
  /** 1–12, yearly only. */
  monthOfYear: number | null;
  startDate: DateStr;
  endDate: DateStr | null;
  /** `YYYY-MM` (monthly) or `YYYY` (yearly): added or skipped. */
  lastHandledPeriod: string | null;
  active: boolean;
}

export interface Template extends RecordMeta {
  id: ID;
  label: string;
  type: EntryType;
  /** null = opens the pad with the category prefilled. */
  amount: Satang | null;
  categoryId: ID;
  note: string;
  order: number;
}

export type YearFormat = "CE" | "BE";

export interface PrivacySettings {
  hideIncome: boolean;
  hideExpense: boolean;
  hideNet: boolean;
  hideBalance: boolean;
}

/** Single row, `id = 'settings'`. */
export interface Settings {
  id: "settings";
  yearFormat: YearFormat;
  privacy: PrivacySettings;
  autoHideOnBackground: boolean;
  /** 0 = off. */
  backupReminderDays: number;
  lastBackupAt: ISODateTime | null;
  defaultAccountId: ID;
  updatedAt: ISODateTime;
}

export interface Meta {
  key: string;
  value: unknown;
}
