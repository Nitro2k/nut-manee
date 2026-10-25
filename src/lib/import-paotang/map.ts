// REMOVE-AFTER-MIGRATION: one-time import from the old app (SPEC §9.4). Delete once the
// history is imported on the phone, backed up as NoMoney JSON, and the old app is retired.

import type { EntryType } from "@/types";

// Old-app category → NoMoney category, and note-based clean-ups (SPEC §9.2).

/**
 * Where an old category lands: a top-level category, or a child under `parent`. Categories
 * with a `systemKey` are found by key (survives renames); the rest by name. A target that
 * doesn't exist yet is created (e.g. Bills › Insurance on a device seeded before it existed).
 */
export interface Target {
  type: EntryType;
  /** Top-level category name, or `key:<systemKey>`. Omit for a top-level target. */
  parent?: string;
  /** Category name, or `key:<systemKey>`. */
  name: string;
  /** Icon if it has to be created. */
  icon?: string;
}

const E = (name: string, parent?: string, icon?: string): Target => ({
  type: "expense",
  name,
  parent,
  icon,
});
const I = (name: string, parent?: string): Target => ({ type: "income", name, parent });

export const OTHER_EXPENSE = E("key:other-expense");
export const OTHER_INCOME = I("key:other-income");
export const SALARY = I("key:salary");
export const CASHBACK_CREDIT_CARD = I("Credit card", "key:cashback");

/** Keyed by `${type}:${normalized old title}`. */
const CATEGORY_MAP = new Map<string, Target>(
  (
    [
      // Expense
      ["อาหารและเครื่องดื่ม", E("Food & Drinks")],
      ["คาเฟ่", E("Cafe", "Food & Drinks")],
      ["ร้านอาหาร", E("Restaurant", "Food & Drinks")],
      ["การเดินทาง", E("Transport")],
      ["น้ำมัน", E("Fuel", "Transport")],
      ["รถแท็กซี่", E("Taxi & Ride", "Transport")],
      ["ค่าที่จอดรถ", E("Parking", "Transport")],
      ["ค่าบำรุงรักษา", E("Maintenance", "Transport")],
      ["ค่าบ้าน / ค่าเช่าบ้าน", E("Rent", "Housing")],
      ["ค่าบ้าน", E("Rent", "Housing")],
      ["ค่าเช่าบ้าน", E("Rent", "Housing")],
      ["ค่าเช่า", E("Rent", "Housing")],
      ["ครอบครัว", E("Housing")],
      ["เฟอร์นิเจอร์", E("Furniture", "Housing")],
      ["ปรับปรุงบ้าน", E("Home repair", "Housing")],
      ["โฮมเซอร์วิส", E("Home service", "Housing")],
      ["บิลและสาธารณูปโภค", E("Bills")],
      ["ค่าไฟฟ้า", E("Electricity", "Bills")],
      ["ค่าน้ำประปา", E("Water", "Bills")],
      ["โทรศัพท์", E("Phone", "Bills")],
      ["อินเทอร์เน็ต", E("Internet", "Bills")],
      ["ประกันภัย", E("Insurance", "Bills", "shield-check")],
      ["ช้อปปิ้ง", E("Shopping")],
      ["เสื้อผ้า", E("Clothes", "Shopping")],
      ["รองเท้า", E("Shoes", "Shopping")],
      ["อุปกรณ์อิเล็กทรอนิกส์", E("Electronics", "Shopping")],
      ["เครื่องใช้ไฟฟ้า", E("Electronics", "Shopping")],
      ["เครื่องประดับ", E("Accessories", "Shopping")],
      ["ของใช้ส่วนตัว", E("Toiletries", "Personal care")],
      ["สุขภาพและฟิตเนส", E("Health")],
      ["การรักษาพยาบาล", E("Medical", "Health")],
      ["ค่ายา", E("Medicine", "Health")],
      ["กีฬา", E("Sports", "Health")],
      ["บันเทิง", E("Entertainment")],
      ["ปาร์ตี้", E("Entertainment")],
      ["เกมส์", E("Games", "Entertainment")],
      ["ภาพยนตร์", E("Movies", "Entertainment")],
      ["การให้และการบริจาค", E("Gifts & Donations")],
      ["การกุศล", E("Charity", "Gifts & Donations")],
      ["งานศพ", E("Funeral", "Gifts & Donations")],
      ["การแต่งงาน", E("Wedding", "Gifts & Donations")],
      ["ท่องเที่ยว", E("Travel")],
      ["โรงแรม / ที่พัก", E("Hotel", "Travel")],
      ["โรงแรม", E("Hotel", "Travel")],
      ["ที่พัก", E("Hotel", "Travel")],
      ["การศึกษา", E("Education")],
      ["หนังสือ", E("Books", "Education")],
      ["โรงเรียน", E("Courses", "Education")],
      ["การลงทุน", E("Investment")],
      ["ค่าธรรมเนียมและค่าบริการ", E("Fees & Charges")],
      ["อื่น ๆ", OTHER_EXPENSE],
      ["ค่าเบ็ดเตล็ด", OTHER_EXPENSE],
      // Income
      ["รายรับ", OTHER_INCOME],
      ["อื่นๆ", OTHER_INCOME],
      ["อื่น ๆ", OTHER_INCOME],
      ["เงินฝาก", OTHER_INCOME],
      ["เงินเดือน", SALARY],
      ["โบนัส/เงินได้พิเศษ/เงินรางวัล", I("Bonus")],
      ["เงินดอกเบี้ย", I("key:interest")],
      ["ของขวัญ", I("Gift")],
      ["ยอดขาย", I("Sales")],
    ] as const
  ).map(([title, target]) => [`${target.type}:${normalizeTitle(title)}`, target]),
);

/** NFC, trimmed, single spaces, so "อื่น  ๆ " still matches. */
export function normalizeTitle(title: string): string {
  return title.normalize("NFC").trim().replace(/\s+/g, " ");
}

export function mapCategory(type: EntryType, oldTitle: string): Target | undefined {
  return CATEGORY_MAP.get(`${type}:${normalizeTitle(oldTitle)}`);
}

export interface CleanupRule {
  id: string;
  label: string;
  target: Target;
  /** Note (already trimmed) of an expense/income in the given mapped target. */
  matches: (row: { type: EntryType; note: string; target: Target }) => boolean;
  /** The note after remapping ('' drops it). */
  note: (note: string) => string;
}

const lower = (s: string) => s.normalize("NFC").trim().toLocaleLowerCase();
const sameTarget = (a: Target, b: Target) =>
  a.type === b.type && a.name === b.name && a.parent === b.parent;
/** Drop the note when it's only the keyword the rule matched. */
const dropIf =
  (...keywords: string[]) =>
  (note: string) =>
    keywords.includes(lower(note)) ? "" : note;

const AI_SERVICES = /claude|anthropic|chat\s*gpt|openai|gemini|copilot|perplexity|midjourney/i;
const STREAMING = /youtube|netflix|spotify|disney/i;

/** SPEC §9.2.8, on by default (a switch in the preview). First match wins. */
export const CLEANUP_RULES: CleanupRule[] = [
  {
    id: "laundry",
    label: "ซักผ้า / น้ำยาปรับผ้านุ่ม → Laundry",
    target: E("Laundry", "Personal care"),
    matches: (r) => r.type === "expense" && ["ซักผ้า", "น้ำยาปรับผ้านุ่ม"].includes(lower(r.note)),
    note: dropIf("ซักผ้า"),
  },
  {
    id: "lottery",
    label: "หวย → Lottery",
    target: E("Lottery"),
    matches: (r) => r.type === "expense" && lower(r.note) === "หวย",
    note: dropIf("หวย"),
  },
  {
    id: "haircut",
    label: "ตัดผม → Haircut",
    target: E("Haircut", "Personal care"),
    matches: (r) => r.type === "expense" && lower(r.note) === "ตัดผม",
    note: dropIf("ตัดผม"),
  },
  {
    id: "ai",
    label: "Claude / ChatGPT / Gemini … → AI tools",
    target: E("AI tools", "Bills", "bot"),
    matches: (r) => r.type === "expense" && AI_SERVICES.test(r.note),
    note: dropIf("claude", "chatgpt", "openai", "gemini"),
  },
  {
    id: "subscriptions",
    label: "YouTube / Netflix / Spotify / Disney → Subscriptions",
    target: E("Subscriptions", "Entertainment"),
    matches: (r) => r.type === "expense" && STREAMING.test(r.note),
    note: dropIf("youtube", "youtube premium", "netflix", "spotify", "disney+"),
  },
  {
    id: "cashback",
    label: "Interest with “cashback” → Cashback › Credit card",
    target: CASHBACK_CREDIT_CARD,
    matches: (r) =>
      r.type === "income" && sameTarget(r.target, I("key:interest")) && /cashback/i.test(r.note),
    note: dropIf("cashback"),
  },
  {
    id: "salary",
    label: "Other income “เงินเดือน” → Salary",
    target: SALARY,
    matches: (r) =>
      r.type === "income" && sameTarget(r.target, OTHER_INCOME) && lower(r.note) === "เงินเดือน",
    note: dropIf("เงินเดือน"),
  },
];
