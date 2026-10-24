import { z } from "zod";
import { DB_SCHEMA_VERSION } from "@/lib/db";
import { isValidAmount } from "@/lib/money";
import type {
  Account,
  Budget,
  Category,
  Recurring,
  Settings,
  Template,
  Transaction,
} from "@/types";

// Validates a backup file at the current schema version. The `z.ZodType<T>` annotations make
// TypeScript fail if a model and its schema drift apart.

export const BACKUP_APP = "nomoney";
export const BACKUP_KIND = "backup";

const id = z.string().min(1);
const isoDateTime = z.iso.datetime({ offset: true });
const date = z.iso.date();
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const entryType = z.enum(["income", "expense"]);
const amount = z.int().refine(isValidAmount, "Invalid amount");

const meta = {
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.nullable(),
};

const transaction: z.ZodType<Transaction> = z.object({
  ...meta,
  id,
  type: entryType,
  amount,
  categoryId: id,
  accountId: id,
  date,
  time,
  note: z.string(),
  origin: z.enum(["manual", "template", "recurring", "import"]),
  recurringId: id.nullable(),
  importRef: z.string().nullable(),
  linkedExpenseId: id.nullable(),
});

const category: z.ZodType<Category> = z.object({
  ...meta,
  id,
  type: entryType,
  name: z.string(),
  parentId: id.nullable(),
  icon: z.string(),
  order: z.number(),
  archived: z.boolean(),
  systemKey: z.string().nullable(),
});

const account: z.ZodType<Account> = z.object({
  ...meta,
  id,
  name: z.string(),
  kind: z.enum(["cash", "bank", "credit"]),
  currency: z.literal("THB"),
  order: z.number(),
  archived: z.boolean(),
});

const budget: z.ZodType<Budget> = z.object({
  ...meta,
  id,
  categoryId: id,
  monthlyLimit: amount.nullable(),
});

const recurring: z.ZodType<Recurring> = z.object({
  ...meta,
  id,
  name: z.string(),
  type: entryType,
  amount,
  categoryId: id,
  accountId: id,
  note: z.string(),
  frequency: z.enum(["monthly", "yearly"]),
  dayOfMonth: z.int().min(1).max(31),
  monthOfYear: z.int().min(1).max(12).nullable(),
  startDate: date,
  endDate: date.nullable(),
  lastHandledPeriod: z.string().nullable(),
  active: z.boolean(),
});

const template: z.ZodType<Template> = z.object({
  ...meta,
  id,
  label: z.string(),
  type: entryType,
  amount: amount.nullable(),
  categoryId: id,
  note: z.string(),
  order: z.number(),
});

const settings: z.ZodType<Settings> = z.object({
  id: z.literal("settings"),
  yearFormat: z.enum(["CE", "BE"]),
  privacy: z.object({
    hideIncome: z.boolean(),
    hideExpense: z.boolean(),
    hideNet: z.boolean(),
    hideBalance: z.boolean(),
  }),
  autoHideOnBackground: z.boolean(),
  backupReminderDays: z.int().min(0),
  lastBackupAt: isoDateTime.nullable(),
  defaultAccountId: id,
  updatedAt: isoDateTime,
});

export const backupDataSchema = z.object({
  transactions: z.array(transaction),
  categories: z.array(category),
  accounts: z.array(account),
  budgets: z.array(budget),
  recurring: z.array(recurring),
  templates: z.array(template),
  settings,
});

export const backupSchema = z.object({
  app: z.literal(BACKUP_APP),
  kind: z.literal(BACKUP_KIND),
  schemaVersion: z.literal(DB_SCHEMA_VERSION),
  appVersion: z.string(),
  exportedAt: isoDateTime,
  data: backupDataSchema,
});

export type BackupData = z.infer<typeof backupDataSchema>;
export type Backup = z.infer<typeof backupSchema>;

/** Only the fields needed to pick migrations; read before full validation. */
export const backupHeaderSchema = z.object({
  app: z.literal(BACKUP_APP),
  kind: z.literal(BACKUP_KIND),
  schemaVersion: z.int().min(1),
  data: z.record(z.string(), z.unknown()),
});
