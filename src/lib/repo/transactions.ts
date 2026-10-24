import { db } from "@/lib/db";
import { nowISO } from "@/lib/dates";
import { isValidAmount } from "@/lib/money";
import type { DateStr, ID, Transaction } from "@/types";
import {
  getLive,
  isLive,
  newId,
  newMeta,
  restore,
  softDelete,
  updateLive,
  type SystemFields,
} from "./base";

export type NewTransaction = Omit<
  Transaction,
  SystemFields | "origin" | "recurringId" | "importRef"
> &
  Partial<Pick<Transaction, "origin" | "recurringId" | "importRef">>;

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

export async function addTransaction(input: NewTransaction): Promise<Transaction> {
  assertAmount(input.amount);
  const tx: Transaction = {
    origin: "manual",
    recurringId: null,
    importRef: null,
    ...input,
    id: newId(),
    ...newMeta(nowISO()),
  };
  await db.transactions.add(tx);
  return tx;
}

export async function updateTransaction(id: ID, changes: TransactionChanges): Promise<void> {
  if (changes.amount !== undefined) assertAmount(changes.amount);
  await updateLive(db.transactions, id, changes);
}

export const deleteTransaction = (id: ID) => softDelete(db.transactions, id);
export const restoreTransaction = (id: ID) => restore(db.transactions, id);
export const getTransaction = (id: ID) => getLive(db.transactions, id);

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
