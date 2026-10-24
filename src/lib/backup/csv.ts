import { db } from "@/lib/db";
import { toBahtString } from "@/lib/money";
import type { Account, Category, ID, Transaction } from "@/types";

// SPEC §5: export-only, one row per live entry. Also the planned Google Sheets row shape.

export const CSV_COLUMNS = [
  "date",
  "time",
  "type",
  "amount",
  "category",
  "subcategory",
  "account",
  "note",
  "id",
] as const;

/** RFC 4180: quote fields with a comma, quote or line break; double inner quotes. */
function field(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/** Oldest first, like a ledger. Deleted entries are left out. */
export function transactionsToCsv(
  transactions: Transaction[],
  categories: Map<ID, Category>,
  accounts: Map<ID, Account>,
): string {
  const rows = transactions
    .filter((t) => t.deletedAt === null)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        a.time.localeCompare(b.time) ||
        a.createdAt.localeCompare(b.createdAt),
    )
    .map((t) => {
      const category = categories.get(t.categoryId);
      const parent = category?.parentId ? categories.get(category.parentId) : undefined;
      const [name, sub] = parent ? [parent.name, category?.name] : [category?.name, ""];
      return [
        t.date,
        t.time,
        t.type,
        toBahtString(t.amount),
        name ?? "",
        sub ?? "",
        accounts.get(t.accountId)?.name ?? "",
        t.note,
        t.id,
      ]
        .map(field)
        .join(",");
    });
  // BOM so Excel and Numbers read the file as UTF-8 (Thai notes and categories).
  return "﻿" + [CSV_COLUMNS.join(","), ...rows].join("\r\n") + "\r\n";
}

export async function buildCsv(): Promise<Blob> {
  const [transactions, categories, accounts] = await Promise.all([
    db.transactions.toArray(),
    db.categories.toArray(),
    db.accounts.toArray(),
  ]);
  const csv = transactionsToCsv(
    transactions,
    new Map(categories.map((c) => [c.id, c])),
    new Map(accounts.map((a) => [a.id, a])),
  );
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
}
