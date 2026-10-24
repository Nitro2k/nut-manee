import { db } from "@/lib/db";
import { nowISO, toTimeStr } from "@/lib/dates";
import { isValidAmount } from "@/lib/money";
import { dueDateIn, isAfterHandled, upcomingPeriods } from "@/lib/recurring";
import type { DateStr, ID, Recurring, Transaction } from "@/types";
import {
  getLive,
  isLive,
  newId,
  newMeta,
  NotFoundError,
  restore,
  softDelete,
  updateLive,
} from "./base";
import { InvalidAmountError } from "./transactions";

export type NewRecurring = Omit<
  Recurring,
  "id" | "createdAt" | "updatedAt" | "deletedAt" | "lastHandledPeriod" | "accountId"
> &
  Partial<Pick<Recurring, "accountId">>;

export type RecurringChanges = Partial<Omit<NewRecurring, "type">>;

export class RecurringRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecurringRuleError";
  }
}

async function assertValid(r: Omit<Recurring, "id" | "createdAt" | "updatedAt" | "deletedAt">) {
  if (!isValidAmount(r.amount)) throw new InvalidAmountError(r.amount);
  if (!r.name.trim()) throw new RecurringRuleError("Name is required");
  if (!Number.isInteger(r.dayOfMonth) || r.dayOfMonth < 1 || r.dayOfMonth > 31) {
    throw new RecurringRuleError("Day must be 1–31");
  }
  if (
    r.frequency === "yearly" &&
    (r.monthOfYear === null || r.monthOfYear < 1 || r.monthOfYear > 12)
  ) {
    throw new RecurringRuleError("Pick a month");
  }
  if (r.endDate && r.endDate < r.startDate) throw new RecurringRuleError("End is before start");
  const category = await getLive(db.categories, r.categoryId);
  if (!category || category.type !== r.type) throw new RecurringRuleError("Pick a category");
}

export async function addRecurring(input: NewRecurring): Promise<Recurring> {
  const accountId = input.accountId ?? (await db.settings.get("settings"))?.defaultAccountId;
  if (!accountId) throw new RecurringRuleError("No default account");
  const row: Recurring = {
    ...input,
    monthOfYear: input.frequency === "yearly" ? input.monthOfYear : null,
    accountId,
    lastHandledPeriod: null,
    id: newId(),
    ...newMeta(),
  };
  await assertValid(row);
  await db.recurring.add(row);
  return row;
}

export async function updateRecurring(id: ID, changes: RecurringChanges): Promise<void> {
  const current = await getLive(db.recurring, id);
  if (!current) throw new NotFoundError("recurring", id);
  const next = { ...current, ...changes };
  if (next.frequency === "monthly") next.monthOfYear = null;
  await assertValid(next);
  await updateLive(db.recurring, id, { ...changes, monthOfYear: next.monthOfYear });
}

export const deleteRecurring = (id: ID) => softDelete(db.recurring, id);

/** Live items, active first, then by name (Thai-aware). */
export async function listRecurring(): Promise<Recurring[]> {
  const rows = await db.recurring.filter(isLive).toArray();
  return rows.sort(
    (a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "th"),
  );
}

/** Move the handled mark forward to `period` (never backward). Call inside a transaction. */
async function markHandled(r: Recurring, period: string): Promise<void> {
  if (!isAfterHandled(r.lastHandledPeriod, period)) return;
  await db.recurring.update(r.id, { lastHandledPeriod: period, updatedAt: nowISO() });
}

export type DueEntryFields = Pick<Transaction, "amount" | "categoryId" | "date" | "note">;

/**
 * Add the entry for one due period and mark it handled, atomically. `fields` overrides the
 * item's amount/category/date/note (the Edit action). Returns null if that period was
 * already handled (e.g. a double tap).
 */
export async function addDueEntry(
  id: ID,
  period: string,
  fields?: Partial<DueEntryFields>,
): Promise<Transaction | null> {
  return db.transaction("rw", [db.recurring, db.transactions, db.categories], async () => {
    const r = await getLive(db.recurring, id);
    if (!r) throw new NotFoundError("recurring", id);
    if (!isAfterHandled(r.lastHandledPeriod, period)) return null;
    const amount = fields?.amount ?? r.amount;
    if (!isValidAmount(amount)) throw new InvalidAmountError(amount);
    const tx: Transaction = {
      type: r.type,
      amount,
      categoryId: fields?.categoryId ?? r.categoryId,
      accountId: r.accountId,
      date: fields?.date ?? dueDateIn(r, period),
      time: toTimeStr(new Date()),
      note: fields?.note ?? r.note,
      origin: "recurring",
      recurringId: r.id,
      importRef: null,
      linkedExpenseId: null,
      id: newId(),
      ...newMeta(),
    };
    await db.transactions.add(tx);
    await markHandled(r, period);
    return tx;
  });
}

export async function skipDue(id: ID, period: string): Promise<void> {
  await db.transaction("rw", db.recurring, async () => {
    const r = await getLive(db.recurring, id);
    if (!r) throw new NotFoundError("recurring", id);
    await markHandled(r, period);
  });
}

/** Skip every period due up to `today` (including ones past the 12-card cap). */
export async function skipAllDue(id: ID, today: DateStr): Promise<void> {
  await db.transaction("rw", db.recurring, async () => {
    const r = await getLive(db.recurring, id);
    if (!r) throw new NotFoundError("recurring", id);
    // No cap here, and only periods actually due: one later this month stays.
    const latest = upcomingPeriods(r, today, Infinity).at(-1);
    if (latest) await markHandled(r, latest.period);
  });
}

export const restoreRecurring = (id: ID) => restore(db.recurring, id);
