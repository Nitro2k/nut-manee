import { addDays, addMonths, format, getDaysInMonth, parseISO } from "date-fns";
import { strings } from "@/lib/strings";
import type { DateStr, ISODateTime, MonthStr, TimeStr, YearFormat } from "@/types";

// All calendar values are wall-clock strings. `parseISO('YYYY-MM-DD')` gives local midnight,
// so date math never crosses a timezone boundary.

const BE_OFFSET = 543;

export function nowISO(date = new Date()): ISODateTime {
  return format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
}

export function toDateStr(date: Date): DateStr {
  return format(date, "yyyy-MM-dd");
}

export function toTimeStr(date: Date): TimeStr {
  return format(date, "HH:mm");
}

export function todayStr(now = new Date()): DateStr {
  return toDateStr(now);
}

export function addDaysStr(date: DateStr, days: number): DateStr {
  return toDateStr(addDays(parseISO(date), days));
}

export function toMonthStr(date: DateStr): MonthStr {
  return date.slice(0, 7);
}

export function addMonthsStr(month: MonthStr, months: number): MonthStr {
  return format(addMonths(parseISO(`${month}-01`), months), "yyyy-MM");
}

/** Inclusive first and last day of a month. */
export function monthRange(month: MonthStr): { start: DateStr; end: DateStr } {
  const first = parseISO(`${month}-01`);
  return {
    start: `${month}-01`,
    end: `${month}-${String(getDaysInMonth(first)).padStart(2, "0")}`,
  };
}

/** Inclusive first and last day of a year. */
export function yearRange(year: number): { start: DateStr; end: DateStr } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

/** Day 29–31 in a short month → that month's last day. `month` is 1–12. */
export function clampDay(year: number, month: number, day: number): DateStr {
  const last = getDaysInMonth(new Date(year, month - 1, 1));
  const d = Math.min(day, last);
  return `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function formatYear(year: number, yearFormat: YearFormat): string {
  return String(yearFormat === "BE" ? year + BE_OFFSET : year);
}

/** "Oct 2026" or "Oct 2569". */
export function formatMonth(month: MonthStr, yearFormat: YearFormat): string {
  const date = parseISO(`${month}-01`);
  return `${format(date, "MMM")} ${formatYear(date.getFullYear(), yearFormat)}`;
}

/** "Today", "Yesterday", or "Mon 19 Oct" (year added when not the current year). */
export function formatDayLabel(date: DateStr, yearFormat: YearFormat, today = todayStr()): string {
  if (date === today) return strings.today;
  if (date === addDaysStr(today, -1)) return strings.yesterday;
  const d = parseISO(date);
  const label = format(d, "EEE d MMM");
  return date.slice(0, 4) === today.slice(0, 4)
    ? label
    : `${label} ${formatYear(d.getFullYear(), yearFormat)}`;
}
