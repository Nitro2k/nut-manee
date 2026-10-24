import type { PrivacySettings } from "@/types";

export type MoneyKind = "income" | "expense" | "net" | "balance" | "neutral";

/** Used until settings load, so nothing flashes unmasked. */
export const ALL_HIDDEN: PrivacySettings = {
  hideIncome: true,
  hideExpense: true,
  hideNet: true,
  hideBalance: true,
};

const SETTING_FOR_KIND: Record<Exclude<MoneyKind, "neutral">, keyof PrivacySettings> = {
  income: "hideIncome",
  expense: "hideExpense",
  net: "hideNet",
  balance: "hideBalance",
};

/** Whether amounts of this kind are masked by settings. `neutral` is masked if any kind is. */
export function isKindHidden(kind: MoneyKind, privacy: PrivacySettings): boolean {
  if (kind === "neutral") return Object.values(privacy).some(Boolean);
  return privacy[SETTING_FOR_KIND[kind]];
}

export function anyHidden(privacy: PrivacySettings): boolean {
  return Object.values(privacy).some(Boolean);
}

/**
 * Blur the whole app via an attribute on <html>. Set directly on the DOM (not React state)
 * so it applies before iOS takes the app-switcher snapshot.
 */
export function setPrivacyBlur(on: boolean): void {
  document.documentElement.toggleAttribute("data-privacy-blur", on);
}
