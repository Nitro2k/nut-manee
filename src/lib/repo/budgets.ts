import { db } from "@/lib/db";
import { isValidAmount } from "@/lib/money";
import type { Budget, ID, Satang } from "@/types";
import { getLive, isLive, newId, newMeta, updateLive } from "./base";
import { CategoryRuleError } from "./categories";
import { InvalidAmountError } from "./transactions";

export const listBudgets = (): Promise<Budget[]> => db.budgets.filter(isLive).toArray();

/** Set a parent expense category's monthly limit; null = "No limit". One live budget per category. */
export async function setBudget(categoryId: ID, monthlyLimit: Satang | null): Promise<void> {
  if (monthlyLimit !== null && !isValidAmount(monthlyLimit)) {
    throw new InvalidAmountError(monthlyLimit);
  }
  await db.transaction("rw", [db.budgets, db.categories], async () => {
    const category = await getLive(db.categories, categoryId);
    if (!category || category.type !== "expense" || category.parentId !== null) {
      throw new CategoryRuleError("Budgets are for top-level expense categories");
    }
    const existing = await db.budgets.where("categoryId").equals(categoryId).filter(isLive).first();
    if (existing) {
      await updateLive(db.budgets, existing.id, { monthlyLimit });
    } else {
      await db.budgets.add({ id: newId(), categoryId, monthlyLimit, ...newMeta() });
    }
  });
}
