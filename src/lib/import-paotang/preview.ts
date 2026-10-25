// REMOVE-AFTER-MIGRATION: one-time import from the old app (SPEC §9.4). Delete once the
// history is imported on the phone, backed up as NoMoney JSON, and the old app is retired.

import { isValidAmount } from "@/lib/money";
import { DEFAULT_CATEGORY_ICON } from "@/lib/seed-data";
import type { Category, DateStr, EntryType, ID, Satang, TimeStr, Transaction } from "@/types";
import { CLEANUP_RULES, mapCategory, normalizeTitle, type Target } from "./map";
import type { PaotangFile } from "./schema";

// Turn an old-app backup into an import plan (SPEC §9.3 preview). Pure: no writes.

export interface PlannedRow {
  importRef: string;
  type: EntryType;
  amount: Satang;
  date: DateStr;
  time: TimeStr;
  note: string;
  targetKey: string;
}

export interface PlannedCategory {
  key: string;
  target: Target;
  /** "Housing › Rent" with the names it will have. */
  label: string;
  /** Existing category, or null when the import creates it. */
  existing: Category | null;
  count: number;
}

export interface MappingRow {
  oldTitle: string;
  /** Where the old category maps (before clean-ups). */
  target: Target;
  type: EntryType;
  label: string;
  count: number;
  /** Not in the mapping table: imported into a new category with the old name. */
  unmapped: boolean;
}

export interface ImportPlan {
  rows: PlannedRow[];
  categories: PlannedCategory[];
  mapping: MappingRow[];
  cleanups: { id: string; label: string; count: number }[];
  counts: {
    inFile: number;
    deleted: number;
    zero: number;
    invalid: number;
    alreadyImported: number;
    toImport: number;
  };
  totals: { income: Satang; expense: Satang; net: Satang };
  /** Net of every live row in the file vs the old wallet balance (SPEC §9.3). */
  balance: { fileNet: Satang; wallet: Satang; ok: boolean };
  firstDate: DateStr | null;
  lastDate: DateStr | null;
  /** Rows matching an existing entry or another row (same date, type, amount, category). Flagged only. */
  possibleDuplicates: number;
}

export interface PlanOptions {
  cleanups: boolean;
}

const keyOf = (t: Target) => `${t.type}|${t.parent ?? ""}|${t.name}`;

function findTarget(target: Target, live: Category[]): Category | undefined {
  const match = (c: Category, ref: string) =>
    ref.startsWith("key:") ? c.systemKey === ref.slice(4) : c.name === ref;
  const ofType = live.filter((c) => c.type === target.type);
  if (!target.parent) return ofType.find((c) => c.parentId === null && match(c, target.name));
  const parent = ofType.find((c) => c.parentId === null && match(c, target.parent!));
  return parent && ofType.find((c) => c.parentId === parent.id && match(c, target.name));
}

/** A display name for a target ref when the category doesn't exist yet. */
const refName = (ref: string, live: Category[], type: EntryType) =>
  ref.startsWith("key:")
    ? (live.find((c) => c.type === type && c.systemKey === ref.slice(4))?.name ?? ref.slice(4))
    : ref;

export function buildImportPlan(
  file: PaotangFile,
  existingCategories: readonly Category[],
  existingTransactions: readonly Transaction[],
  options: PlanOptions,
): ImportPlan {
  const live = existingCategories.filter((c) => c.deletedAt === null);
  const oldCategories = new Map(file.categoryInfos.map((c) => [c.id, c]));
  const typeOf = (t: 0 | 1): EntryType => (t === 0 ? "income" : "expense");

  /** Old category → target; unmapped ones become a new category (under the mapped parent if any). */
  const targetFor = (oldId: string): { target: Target; unmapped: boolean } => {
    const old = oldCategories.get(oldId);
    const type = typeOf(old?.type ?? 1);
    const title = normalizeTitle(old?.title ?? "?");
    const mapped = mapCategory(type, title);
    if (mapped) return { target: mapped, unmapped: false };
    const parentOld = old?.parentCategoryInfoId
      ? oldCategories.get(old.parentCategoryInfoId)
      : undefined;
    const parentTarget = parentOld ? mapCategory(type, parentOld.title) : undefined;
    // Max depth 2: hang it under the parent's top-level category.
    const parent = parentTarget ? (parentTarget.parent ?? parentTarget.name) : undefined;
    return { target: { type, name: title, parent, icon: DEFAULT_CATEGORY_ICON }, unmapped: true };
  };

  const importedRefs = new Set(existingTransactions.map((t) => t.importRef).filter(Boolean));
  const counts = {
    inFile: file.transactionInfos.length,
    deleted: 0,
    zero: 0,
    invalid: 0,
    alreadyImported: 0,
    toImport: 0,
  };
  const targets = new Map<string, Target>();
  const mapping = new Map<string, MappingRow>();
  const cleanupCounts = new Map<string, number>(CLEANUP_RULES.map((r) => [r.id, 0]));
  const rows: PlannedRow[] = [];
  let fileNet = 0;

  for (const old of file.transactionInfos) {
    if (old.isDel) {
      counts.deleted++;
      continue;
    }
    const amount = Math.round(old.mainValue * 100);
    const type = typeOf(old.type);
    fileNet += type === "income" ? amount : -amount;
    if (amount === 0) {
      counts.zero++; // includes the 0-baht "Init Wallet" row
      continue;
    }
    if (!isValidAmount(amount)) {
      counts.invalid++;
      continue;
    }
    if (importedRefs.has(old.id)) {
      counts.alreadyImported++;
      continue;
    }

    const oldCategory = oldCategories.get(old.categoryInfoid);
    const { target: mappedTarget, unmapped } = targetFor(old.categoryInfoid);
    const remark = (old.remark ?? "").trim();
    // The old app filled the note with the category name when none was typed.
    let note = oldCategory && remark === oldCategory.title.trim() ? "" : remark;
    let target = mappedTarget;
    if (options.cleanups) {
      const rule = CLEANUP_RULES.find((r) => r.matches({ type, note, target }));
      if (rule) {
        target = rule.target;
        note = rule.note(note);
        cleanupCounts.set(rule.id, (cleanupCounts.get(rule.id) ?? 0) + 1);
      }
    }

    const mapKey = `${type}|${old.categoryInfoid}`;
    const row = mapping.get(mapKey) ?? {
      oldTitle: oldCategory?.title ?? "?",
      target: mappedTarget,
      type,
      label: "",
      count: 0,
      unmapped,
    };
    row.count++;
    mapping.set(mapKey, row);

    const key = keyOf(target);
    targets.set(key, target);
    rows.push({
      importRef: old.id,
      type,
      amount,
      date: old.saveDate.slice(0, 10),
      time: old.saveDate.slice(11, 16),
      note,
      targetKey: key,
    });
  }
  counts.toImport = rows.length;

  /** "Housing › Rent", using current names where the category exists. */
  const labelFor = (target: Target) => {
    const existing = findTarget(target, live);
    const name = existing?.name ?? refName(target.name, live, target.type);
    const parent = target.parent ? refName(target.parent, live, target.type) : null;
    return parent ? `${parent} › ${name}` : name;
  };
  const rowCount = new Map<string, number>();
  for (const r of rows) rowCount.set(r.targetKey, (rowCount.get(r.targetKey) ?? 0) + 1);
  const categories: PlannedCategory[] = [...targets].map(([key, target]) => ({
    key,
    target,
    label: labelFor(target),
    existing: findTarget(target, live) ?? null,
    count: rowCount.get(key) ?? 0,
  }));
  const mappingRows = [...mapping.values()]
    .map((m) => ({ ...m, label: labelFor(m.target) }))
    .sort((a, b) => b.count - a.count);

  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + r.amount, 0);
  const expense = rows.filter((r) => r.type === "expense").reduce((s, r) => s + r.amount, 0);
  const wallet = Math.round((file.walletInfos[0]?.mainBalance ?? 0) * 100);
  const dates = rows.map((r) => r.date).sort();

  // Possible duplicates: same date + type + amount + resolved category as an existing live
  // entry, or as an earlier row in this file.
  const idOf = new Map(categories.map((c) => [c.key, c.existing?.id ?? `new:${c.key}`]));
  const seen = new Set(
    existingTransactions
      .filter((t) => t.deletedAt === null)
      .map((t) => `${t.date}|${t.type}|${t.amount}|${t.categoryId}`),
  );
  let possibleDuplicates = 0;
  for (const r of rows) {
    const k = `${r.date}|${r.type}|${r.amount}|${idOf.get(r.targetKey) as ID}`;
    if (seen.has(k)) possibleDuplicates++;
    else seen.add(k);
  }

  return {
    rows,
    categories: categories.sort((a, b) => b.count - a.count),
    mapping: mappingRows,
    cleanups: CLEANUP_RULES.map((r) => ({
      id: r.id,
      label: r.label,
      count: cleanupCounts.get(r.id) ?? 0,
    })),
    counts,
    totals: { income, expense, net: income - expense },
    balance: { fileNet, wallet, ok: fileNet === wallet },
    firstDate: dates[0] ?? null,
    lastDate: dates.at(-1) ?? null,
    possibleDuplicates,
  };
}
