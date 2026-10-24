import { MAX_AMOUNT, parseBaht } from "@/lib/money";
import type { Satang } from "@/types";

// Calculator for the amount pad: "120+45−20". A tiny tokenizer over + and −, never `eval`.
// Every number is converted to satang first, so the arithmetic is integer-only.

export type Operator = "+" | "-";
export type CalcKey =
  "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "." | Operator | "back";

type Token = { kind: "num"; value: Satang } | { kind: "op"; op: Operator };

const MINUS = "−";

/** Display form: ASCII "-" becomes "−". */
export function displayExpr(expr: string): string {
  return expr.replaceAll("-", MINUS);
}

function isOperator(ch: string | undefined): ch is Operator {
  return ch === "+" || ch === "-";
}

/** The number currently being typed (after the last operator). */
function currentNumber(expr: string): string {
  const i = Math.max(expr.lastIndexOf("+"), expr.lastIndexOf("-"));
  return expr.slice(i + 1);
}

/**
 * Lenient tokenizer: accepts "−" or "-", ignores a leading or trailing operator,
 * and keeps only the last of repeated operators. Returns null on a malformed number.
 */
export function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  const parts = input
    .replaceAll(MINUS, "-")
    .replace(/\s/g, "")
    .split(/([+-])/);
  for (const part of parts) {
    if (part === "") continue;
    if (isOperator(part)) {
      const last = tokens.at(-1);
      if (!last) continue; // leading operator
      if (last.kind === "op")
        last.op = part; // double operator: last wins
      else tokens.push({ kind: "op", op: part });
      continue;
    }
    const value = parseBaht(part);
    if (value === null) return null;
    tokens.push({ kind: "num", value });
  }
  if (tokens.at(-1)?.kind === "op") tokens.pop(); // trailing operator
  return tokens;
}

/** Result in satang, or null when empty or malformed. May be ≤ 0 or ≥ max: check with `isValidAmount`. */
export function evaluate(input: string): Satang | null {
  const tokens = tokenize(input);
  if (!tokens || tokens.length === 0) return null;
  let total = 0;
  let op: Operator = "+";
  for (const t of tokens) {
    if (t.kind === "op") op = t.op;
    else total = op === "+" ? total + t.value : total - t.value;
  }
  return total;
}

/** True while the expression has an operation to resolve (the primary key shows "="). */
export function hasPendingOp(input: string): boolean {
  const tokens = tokenize(input);
  return !!tokens && tokens.some((t) => t.kind === "op");
}

/**
 * Apply one pad key to the expression (ASCII operators). Keeps the expression well-formed:
 * no leading operator, an operator replaces a previous one, one "." per number, max 2 decimals,
 * no leading zeros, and no single number at or above the max amount.
 */
export function pressKey(expr: string, key: CalcKey): string {
  if (key === "back") return expr.slice(0, -1);

  const last = expr.at(-1);
  if (isOperator(key)) {
    if (expr === "") return expr;
    if (isOperator(last)) return expr.slice(0, -1) + key;
    if (last === ".") return expr.slice(0, -1) + key;
    return expr + key;
  }

  const num = currentNumber(expr);
  if (key === ".") {
    if (num.includes(".")) return expr;
    return expr + (num === "" ? "0." : ".");
  }

  // digit
  const dot = num.indexOf(".");
  if (dot !== -1 && num.length - dot > 2) return expr; // already 2 decimals
  if (num === "0") return expr.slice(0, -1) + key; // replace leading zero
  const next = parseBaht(num + key);
  if (next === null || next >= MAX_AMOUNT) return expr;
  return expr + key;
}
