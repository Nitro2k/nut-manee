import { db } from "@/lib/db";
import { nowISO } from "@/lib/dates";
import { isValidAmount } from "@/lib/money";
import type { DateStr, EntryType, ID, Satang, Transaction } from "@/types";
import {
  getLive,
  isLive,
  newId,
  newMeta,
  NotFoundError,
  updateLive,
  type SystemFields,
} from "./base";

export type NewTransaction = Omit<
  Transaction,
  SystemFields | "origin" | "recurringId" | "importRef" | "linkedExpenseId"
> &
  Partial<Pick<Transaction, "origin" | "recurringId" | "importRef" | "linkedExpenseId">>;

export type TransactionChanges = Partial<Omit<Transaction, SystemFields | "importRef">>;

export class InvalidAmountError extends Error {
  constructor(amount: number) {
    super(`Invalid amount: ${amount}`);
    this.name = "InvalidAmountError";
  }
}

function assertAmount(amount: number): void {
  if (!isValidAmount(amount)) throw new InvalidAmountError(amount);
}

export class InvalidLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidLinkError";
  }
}

/** A link is only allowed from an income entry to a live expense. */
async function assertLink(type: Transaction["type"], linkedExpenseId: ID | null | undefined) {
  if (!linkedExpenseId) return;
  if (type !== "income") throw new InvalidLinkError("Only income can link to an expense");
  const expense = await getLive(db.transactions, linkedExpenseId);
  if (!expense || expense.type !== "expense") {
    throw new InvalidLinkError("Linked expense not found");
  }
}

export async function addTransaction(input: NewTransaction): Promise<Transaction> {
  assertAmount(input.amount);
  await assertLink(input.type, input.linkedExpenseId);
  const tx: Transaction = {
    origin: "manual",
    recurringId: null,
    importRef: null,
    linkedExpenseId: null,
    ...input,
    id: newId(),
    ...newMeta(nowISO()),
  };
  await db.transactions.add(tx);
  return tx;
}

export async function updateTransaction(id: ID, changes: TransactionChanges): Promise<void> {
  if (changes.amount !== undefined) assertAmount(changes.amount);
  if (changes.linkedExpenseId !== undefined || changes.type !== undefined) {
    const current = await getLive(db.transactions, id);
    if (!current) throw new NotFoundError("transactions", id);
    const type = changes.type ?? current.type;
    // `null` means "unlink", so only fall back when the field wasn't given.
    await assertLink(
      type,
      changes.linkedExpenseId !== undefined ? changes.linkedExpenseId : current.linkedExpenseId,
    );
    if (current.type === "expense" && type !== "expense" && (await listLinkedCashback(id)).length) {
      throw new InvalidLinkError("This expense has cashback linked to it");
    }
  }
  await updateLive(db.transactions, id, changes);
}

export const getTransaction = (id: ID) => getLive(db.transactions, id);

/** Soft delete an entry. Deleting an expense also deletes its linked cashback (same timestamp). */
export async function deleteTransaction(id: ID): Promise<void> {
  await db.transaction("rw", db.transactions, async () => {
    const tx = await getLive(db.transactions, id);
    if (!tx) throw new NotFoundError("transactions", id);
    const linked =
      tx.type === "expense"
        ? await db.transactions.where("linkedExpenseId").equals(id).filter(isLive).primaryKeys()
        : [];
    const now = nowISO();
    await db.transactions.bulkUpdate(
      [id, ...linked].map((key) => ({ key, changes: { deletedAt: now, updatedAt: now } })),
    );
  });
}

/** Undo a delete, including linked cashback that was deleted together with it. */
export async function restoreTransaction(id: ID): Promise<void> {
  await db.transaction("rw", db.transactions, async () => {
    const tx = await db.transactions.get(id);
    if (!tx) throw new NotFoundError("transactions", id);
    if (tx.deletedAt === null) return;
    const deletedAt = tx.deletedAt;
    const linked = await db.transactions
      .where("linkedExpenseId")
      .equals(id)
      .filter((t) => t.deletedAt === deletedAt)
      .primaryKeys();
    const now = nowISO();
    await db.transactions.bulkUpdate(
      [id, ...linked].map((key) => ({ key, changes: { deletedAt: null, updatedAt: now } })),
    );
  });
}

/** Live cashback entries linked to an expense. */
export async function listLinkedCashback(expenseId: ID): Promise<Transaction[]> {
  return db.transactions.where("linkedExpenseId").equals(expenseId).filter(isLive).toArray();
}

/** Live transactions with `start <= date <= end`, newest first (date, then time). */
export async function listTransactions(start: DateStr, end: DateStr): Promise<Transaction[]> {
  const rows = await db.transactions
    .where("date")
    .between(start, end, true, true)
    .filter(isLive)
    .toArray();
  return rows.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      b.time.localeCompare(a.time) ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

/**
 * Up to `limit` category ids for the picker's "recent" row: the most used among the latest
 * `sample` entries of this type, ties broken by most recent use.
 */
export async function recentCategoryIds(type: EntryType, limit = 8, sample = 100): Promise<ID[]> {
  const rows = await db.transactions
    .orderBy("date")
    .reverse()
    .filter((t) => isLive(t) && t.type === type)
    .limit(sample)
    .toArray();
  const stats = new Map<ID, { count: number; firstSeen: number }>();
  rows.forEach((t, i) => {
    const s = stats.get(t.categoryId);
    if (s) s.count++;
    else stats.set(t.categoryId, { count: 1, firstSeen: i });
  });
  return [...stats]
    .sort(([, a], [, b]) => b.count - a.count || a.firstSeen - b.firstSeen)
    .slice(0, limit)
    .map(([id]) => id);
}

/** Where new cashback goes: Cashback › its first source (Credit card), else Cashback itself. */
async function cashbackCategoryId(): Promise<ID> {
  const root = await db.categories.where("systemKey").equals("cashback").filter(isLive).first();
  if (!root) throw new Error("Cashback category missing");
  const sources = await db.categories
    .where("parentId")
    .equals(root.id)
    .filter((c) => isLive(c) && !c.archived)
    .toArray();
  return sources.sort((a, b) => a.order - b.order)[0]?.id ?? root.id;
}

/**
 * Make an expense's linked cashback equal `amount` (null = none), as one entry on the
 * expense's date: update the existing one, add one in Cashback › Credit card, or soft-delete.
 * Run it in the same Dexie transaction as the expense save (tables: transactions, categories),
 * awaited inside an `async` callback (a plain arrow returning it commits too early).
 */
export async function setExpenseCashback(
  expense: Pick<Transaction, "id" | "date" | "time" | "accountId">,
  amount: Satang | null,
): Promise<void> {
  const linked = (await listLinkedCashback(expense.id)).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const [keep, ...extra] = amount ? linked : [];
  const now = nowISO();
  const removed = amount ? extra : linked;
  if (removed.length) {
    await db.transactions.bulkUpdate(
      removed.map((t) => ({ key: t.id, changes: { deletedAt: now, updatedAt: now } })),
    );
  }
  if (!amount) return;
  assertAmount(amount);
  if (keep) {
    if (keep.amount !== amount || keep.date !== expense.date) {
      await db.transactions.update(keep.id, { amount, date: expense.date, updatedAt: now });
    }
    return;
  }
  await addTransaction({
    type: "income",
    amount,
    categoryId: await cashbackCategoryId(),
    accountId: expense.accountId,
    date: expense.date,
    time: expense.time,
    note: "",
    linkedExpenseId: expense.id,
  });
}
