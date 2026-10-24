import { db } from "@/lib/db";
import type { Category, EntryType, ID } from "@/types";
import {
  getLive,
  isLive,
  newId,
  newMeta,
  NotFoundError,
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

export async function addCategory(input: NewCategory): Promise<Category> {
  await assertValidParent(input.parentId, input.type);
  // Append after its siblings. Top-level rows (parentId null) aren't in the index, so filter.
  const order =
    input.order ??
    (await db.categories
      .filter((c) => isLive(c) && c.type === input.type && c.parentId === input.parentId)
      .count());
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
