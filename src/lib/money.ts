import type { Satang } from "@/types";

// Money is integer satang everywhere. These are the only boundary conversions:
// user input (parseBaht), old-app floats (bahtToSatang), display (formatBaht), CSV (toBahtString).

/** Exclusive upper bound for one entry: ฿10,000,000. */
export const MAX_AMOUNT: Satang = 10_000_000_00;

const groupFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** Amount for one entry must be > 0 and < ฿10M. */
export function isValidAmount(amount: Satang): boolean {
  return Number.isSafeInteger(amount) && amount > 0 && amount < MAX_AMOUNT;
}

/**
 * Parse a baht string ("1,234.5", "12", ".5") into satang without float math.
 * Returns null for anything else, including more than 2 decimals or a sign.
 */
export function parseBaht(input: string): Satang | null {
  const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(input.replace(/[,\s]/g, ""));
  if (!match) return null;
  const [, whole = "", frac = ""] = match;
  if (whole === "" && frac === "") return null;
  if (whole.length > 13) return null;
  return Number(whole || "0") * 100 + Number(frac.padEnd(2, "0"));
}

/** Convert a float baht value from an external source (e.g. the old app). */
export function bahtToSatang(baht: number): Satang {
  return Math.round(baht * 100);
}

function splitSatang(amount: Satang): { sign: string; whole: number; frac: string } {
  const abs = Math.abs(amount);
  return {
    sign: amount < 0 ? "-" : "",
    whole: Math.floor(abs / 100),
    frac: String(abs % 100).padStart(2, "0"),
  };
}

/** "฿1,234.50" / "-฿1,234.50". Display only — use through `<Money>`, never directly in UI. */
export function formatBaht(amount: Satang): string {
  const { sign, whole, frac } = splitSatang(amount);
  return `${sign}฿${groupFormat.format(whole)}.${frac}`;
}

/** "1234.50" / "-1234.50": plain decimal string for CSV and editing. */
export function toBahtString(amount: Satang): string {
  const { sign, whole, frac } = splitSatang(amount);
  return `${sign}${whole}.${frac}`;
}

export function sumSatang(amounts: readonly Satang[]): Satang {
  let total = 0;
  for (const a of amounts) total += a;
  return total;
}

/** `part / total` as a percentage (display only). null when total ≤ 0. */
export function percent(part: Satang, total: Satang): number | null {
  return total > 0 ? (part / total) * 100 : null;
}
