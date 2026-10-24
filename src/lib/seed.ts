import { db } from "@/lib/db";
import { nowISO } from "@/lib/dates";
import { newId, newMeta } from "@/lib/repo/base";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, type SeedCategory } from "@/lib/seed-data";
import type { Account, Category, EntryType, Settings } from "@/types";

export const SEEDED_KEY = "seededAt";

function buildCategories(type: EntryType, seeds: SeedCategory[], now: string): Category[] {
  const rows: Category[] = [];
  seeds.forEach((seed, order) => {
    const parent = toCategory(type, seed, null, order, now);
    rows.push(parent);
    seed.children?.forEach((child, childOrder) => {
      rows.push(toCategory(type, child, parent.id, childOrder, now));
    });
  });
  return rows;
}

function toCategory(
  type: EntryType,
  seed: SeedCategory,
  parentId: string | null,
  order: number,
  now: string,
): Category {
  return {
    id: newId(),
    type,
    name: seed.name,
    parentId,
    icon: seed.icon,
    order,
    archived: false,
    systemKey: seed.systemKey ?? null,
    ...newMeta(now),
  };
}

/**
 * First-launch seed: default categories, the "Cash" account and the settings row
 * (privacy all hidden). Runs in one transaction and only once. Returns true if it seeded.
 */
export async function ensureSeeded(): Promise<boolean> {
  return db.transaction("rw", [db.categories, db.accounts, db.settings, db.meta], async () => {
    if (await db.meta.get(SEEDED_KEY)) return false;

    const now = nowISO();
    const cash: Account = {
      id: newId(),
      name: "Cash",
      kind: "cash",
      currency: "THB",
      order: 0,
      archived: false,
      ...newMeta(now),
    };
    const settings: Settings = {
      id: "settings",
      yearFormat: "CE",
      privacy: { hideIncome: true, hideExpense: true, hideNet: true, hideBalance: true },
      autoHideOnBackground: true,
      backupReminderDays: 7,
      lastBackupAt: null,
      defaultAccountId: cash.id,
      updatedAt: now,
    };

    await db.accounts.add(cash);
    await db.settings.add(settings);
    await db.categories.bulkAdd([
      ...buildCategories("expense", EXPENSE_CATEGORIES, now),
      ...buildCategories("income", INCOME_CATEGORIES, now),
    ]);
    await db.meta.put({ key: SEEDED_KEY, value: now });
    return true;
  });
}
