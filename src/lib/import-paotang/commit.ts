import { db } from "@/lib/db";
import { nowISO } from "@/lib/dates";
import { addCategory } from "@/lib/repo/categories";
import { newId, newMeta } from "@/lib/repo/base";
import { getSettings } from "@/lib/repo/settings";
import { DEFAULT_CATEGORY_ICON } from "@/lib/seed-data";
import type { Category, ID, Transaction } from "@/types";
import type { Target } from "./map";
import type { ImportPlan } from "./preview";

export const LAST_IMPORT_KEY = "lastImport";

export interface ImportResult {
  imported: number;
  createdCategories: number;
}

/**
 * Write a plan in one Dexie transaction (SPEC §9.3): create missing categories, add every row
 * as an `origin: "import"` entry. Rows whose `importRef` exists by now are skipped, so
 * importing twice (or a newer backup later) only adds what's new.
 */
export async function commitImport(plan: ImportPlan): Promise<ImportResult> {
  return db.transaction("rw", [db.transactions, db.categories, db.settings, db.meta], async () => {
    const settings = await getSettings();
    const categories = await db.categories.filter((c) => c.deletedAt === null).toArray();
    let createdCategories = 0;

    const find = (type: Target["type"], ref: string, parentId: ID | null) =>
      categories.find(
        (c) =>
          c.type === type &&
          c.parentId === parentId &&
          (ref.startsWith("key:") ? c.systemKey === ref.slice(4) : c.name === ref),
      );
    const ensure = async (
      type: Target["type"],
      ref: string,
      parentId: ID | null,
      icon?: string,
    ) => {
      const existing = find(type, ref, parentId);
      if (existing) return existing;
      if (ref.startsWith("key:")) throw new Error(`Built-in category missing: ${ref}`);
      const created: Category = await addCategory({
        type,
        name: ref,
        parentId,
        icon: icon ?? DEFAULT_CATEGORY_ICON,
      });
      categories.push(created);
      createdCategories++;
      return created;
    };

    const categoryIdByKey = new Map<string, ID>();
    for (const { key, target } of plan.categories) {
      const parent = target.parent ? await ensure(target.type, target.parent, null) : null;
      const category = await ensure(target.type, target.name, parent?.id ?? null, target.icon);
      categoryIdByKey.set(key, category.id);
    }

    const refs = plan.rows.map((r) => r.importRef);
    const existingRefs = new Set(
      (await db.transactions.where("importRef").anyOf(refs).toArray()).map((t) => t.importRef),
    );
    const now = nowISO();
    const rows: Transaction[] = plan.rows
      .filter((r) => !existingRefs.has(r.importRef))
      .map((r) => ({
        id: newId(),
        type: r.type,
        amount: r.amount,
        categoryId: categoryIdByKey.get(r.targetKey)!,
        accountId: settings.defaultAccountId,
        date: r.date,
        time: r.time,
        note: r.note,
        origin: "import",
        recurringId: null,
        importRef: r.importRef,
        linkedExpenseId: null,
        ...newMeta(now),
      }));
    await db.transactions.bulkAdd(rows);
    await db.meta.put({
      key: LAST_IMPORT_KEY,
      value: {
        at: now,
        imported: rows.length,
        firstDate: plan.firstDate,
        lastDate: plan.lastDate,
        createdCategories,
      },
    });
    return { imported: rows.length, createdCategories };
  });
}
