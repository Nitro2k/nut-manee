import { Dexie, type Table } from "dexie";
import type {
  Account,
  Budget,
  Category,
  Meta,
  Recurring,
  Settings,
  Template,
  Transaction,
} from "@/types";

/**
 * Bump on every schema change, together with a new `db.version(n)` (with `upgrade()`),
 * an export-file migration, and a test using a previous-version fixture.
 */
export const DB_SCHEMA_VERSION = 1;

export const DB_NAME = "nomoney";

export class NoMoneyDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  accounts!: Table<Account, string>;
  budgets!: Table<Budget, string>;
  recurring!: Table<Recurring, string>;
  templates!: Table<Template, string>;
  settings!: Table<Settings, string>;
  meta!: Table<Meta, string>;

  constructor(name = DB_NAME) {
    super(name);
    // IndexedDB doesn't index null or boolean values: the `deletedAt` index only holds
    // tombstones (useful for sync), so live rows are filtered with `.filter()`, not `where()`.
    this.version(1).stores({
      transactions:
        "id, date, [date+type], categoryId, [categoryId+date], accountId, importRef, linkedExpenseId, updatedAt, deletedAt",
      categories: "id, type, parentId, systemKey, order",
      accounts: "id",
      budgets: "id, categoryId",
      recurring: "id",
      templates: "id, order", // unused (feature dropped), kept so v1 stays valid
      settings: "id",
      meta: "key",
    });
  }
}

export const db = new NoMoneyDB();
