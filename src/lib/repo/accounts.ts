import { db } from "@/lib/db";
import type { Account } from "@/types";
import { getLive } from "./base";
import { getSettings } from "./settings";

/** The default ("Cash") account every v1 transaction uses. */
export async function getDefaultAccount(): Promise<Account> {
  const { defaultAccountId } = await getSettings();
  const account = await getLive(db.accounts, defaultAccountId);
  if (!account) throw new Error("Default account missing");
  return account;
}
