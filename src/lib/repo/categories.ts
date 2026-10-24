import { db } from "@/lib/db";
import { nowISO } from "@/lib/dates";
import type { Category, EntryType, ID } from "@/types";
import {
  getLive,
  isLive,
  newId,
  newMeta,
  NotFoundError,
  softDelete,
  updateLive,
  type SystemFields,
} from "./base";

export type NewCategory = Omit<Category, SystemFields | "order" | "archived" | "systemKey"> &
  Partial<Pick<Category, "order" | "archived" | "systemKey">>;

export class CategoryRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CategoryRuleError";
  }
}

/** A child's parent must exist, be top-level (max depth 2), and have the same type. */
async function assertValidParent(parentId: ID | null, type: EntryType): Promise<void> {
  if (parentId === null) return;
  const parent = await getLive(db.categories, parentId);
  if (!parent) throw new CategoryRuleError("Parent category not found");
  if (parent.parentId !== null) throw new CategoryRuleError("Categories can only be 2 levels deep");
  if (parent.type !== type) throw new CategoryRuleError("Parent category has a different type");
}

/** Live categories with the same type and parent, sorted by `order` (archived included). */
async function siblingsOf(type: EntryType, parentId: ID | null): Promise<Category[]> {
  // Top-level rows (parentId null) aren't in the index, so filter.
  const rows = await db.categories
    .filter((c) => isLive(c) && c.type === type && c.parentId === parentId)
    .toArray();
  return rows.sort((a, b) => a.order - b.order);
}

export async function addCategory(input: NewCategory): Promise<Category> {
  await assertValidParent(input.parentId, input.type);
  const order = input.order ?? (await siblingsOf(input.type, input.parentId)).length;
  const category: Category = {
    archived: false,
    systemKey: null,
    ...input,
    order,
    id: newId(),
    ...newMeta(),
  };
  await db.categories.add(category);
  return category;
}

export async function updateCategory(
  id: ID,
  changes: Partial<Omit<Category, SystemFields | "type" | "systemKey">>,
): Promise<void> {
  const current = await getLive(db.categories, id);
  if (!current) throw new NotFoundError("categories", id);
  if (changes.parentId !== undefined && changes.parentId !== current.parentId) {
    if (changes.parentId === id) throw new CategoryRuleError("A category can't be its own parent");
    const hasChildren =
      (await db.categories.where("parentId").equals(id).filter(isLive).count()) > 0;
    if (hasChildren && changes.parentId !== null) {
      throw new CategoryRuleError("A category with children can't become a child");
    }
    await assertValidParent(changes.parentId, current.type);
    // Moved under another parent: append after its new siblings.
    changes = { ...changes, order: (await siblingsOf(current.type, changes.parentId)).length };
  }
  await updateLive(db.categories, id, changes);
}

export const getCategory = (id: ID) => getLive(db.categories, id);

/** Live categories sorted by `order`. Archived ones are excluded unless asked for. */
export async function listCategories(
  type?: EntryType,
  { includeArchived = false } = {},
): Promise<Category[]> {
  const rows = await (
    type ? db.categories.where("type").equals(type) : db.categories.toCollection()
  )
    .filter((c) => isLive(c) && (includeArchived || !c.archived))
    .toArray();
  return rows.sort((a, b) => a.order - b.order);
}

export async function getCategoryBySystemKey(systemKey: string): Promise<Category | undefined> {
  return db.categories.where("systemKey").equals(systemKey).filter(isLive).first();
}

/** Swap with the previous (-1) or next (+1) non-archived sibling, then renumber the siblings. */
export async function moveCategory(id: ID, direction: -1 | 1): Promise<void> {
  await db.transaction("rw", db.categories, async () => {
    const current = await getLive(db.categories, id);
    if (!current) throw new NotFoundError("categories", id);
    const siblings = await siblingsOf(current.type, current.parentId);
    const visible = siblings.filter((c) => !c.archived);
    const from = visible.findIndex((c) => c.id === id);
    const neighbor = visible[from + direction];
    if (!neighbor) return;

    const ordered = [...siblings];
    const a = ordered.findIndex((c) => c.id === id);
    const b = ordered.findIndex((c) => c.id === neighbor.id);
    [ordered[a], ordered[b]] = [ordered[b]!, ordered[a]!];

    const now = nowISO();
    const changed = ordered.flatMap((c, order) =>
      c.order === order ? [] : [{ key: c.id, changes: { order, updatedAt: now } }],
    );
    await db.categories.bulkUpdate(changed);
  });
}

export interface CategoryUsage {
  /** Live entries using it. */
  entries: number;
  /** Live subcategories. */
  children: number;
}

export async function categoryUsage(id: ID): Promise<CategoryUsage> {
  const [entries, children] = await Promise.all([
    db.transactions.where("categoryId").equals(id).filter(isLive).count(),
    db.categories.where("parentId").equals(id).filter(isLive).count(),
  ]);
  return { entries, children };
}

/** Throws if the category can't be deleted or merged away; returns its usage otherwise. */
async function assertRemovable(category: Category): Promise<CategoryUsage> {
  if (category.systemKey) throw new CategoryRuleError("Built-in categories can't be deleted");
  const usage = await categoryUsage(category.id);
  if (usage.children > 0) throw new CategoryRuleError("Move or delete its subcategories first");
  return usage;
}

async function removeCategory(id: ID): Promise<void> {
  const budgets = await db.budgets.where("categoryId").equals(id).filter(isLive).toArray();
  for (const budget of budgets) await softDelete(db.budgets, budget.id);
  await softDelete(db.categories, id);
}

/** Soft-delete an unused category. Used ones must be merged into another with `mergeCategory`. */
export async function deleteCategory(id: ID): Promise<void> {
  await db.transaction("rw", [db.categories, db.transactions, db.budgets], async () => {
    const category = await getLive(db.categories, id);
    if (!category) throw new NotFoundError("categories", id);
    const usage = await assertRemovable(category);
    if (usage.entries > 0) throw new CategoryRuleError("Category is in use; merge it instead");
    await removeCategory(id);
  });
}

/**
 * Move every entry (deleted ones too, so Undo still lands somewhere valid) and recurring item
 * from `sourceId` to `targetId`, then soft-delete the source. Returns how many live entries moved.
 */
export async function mergeCategory(sourceId: ID, targetId: ID): Promise<number> {
  return db.transaction(
    "rw",
    [db.categories, db.transactions, db.budgets, db.recurring],
    async () => {
      if (sourceId === targetId) throw new CategoryRuleError("Pick a different category");
      const [source, target] = await Promise.all([
        getLive(db.categories, sourceId),
        getLive(db.categories, targetId),
      ]);
      if (!source) throw new NotFoundError("categories", sourceId);
      if (!target) throw new NotFoundError("categories", targetId);
      if (source.type !== target.type) {
        throw new CategoryRuleError("Categories have different types");
      }
      const usage = await assertRemovable(source);

      const now = nowISO();
      const move = { categoryId: targetId, updatedAt: now };
      await db.transactions.where("categoryId").equals(sourceId).modify(move);
      await db.recurring.filter((r) => r.categoryId === sourceId).modify(move);
      await removeCategory(sourceId);
      return usage.entries;
    },
  );
}
