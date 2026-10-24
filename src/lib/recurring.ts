import { addMonthsStr, clampDay, monthRange } from "@/lib/dates";
import type { DateStr, Recurring } from "@/types";

// Recurring schedule math (SPEC §13). Pure: no database, `today` is passed in.
// A period is 'YYYY-MM' (monthly) or 'YYYY' (yearly). `lastHandledPeriod` marks the latest
// period that was added or skipped; everything up to the end of that period counts as handled.

export type Schedule = Pick<
  Recurring,
  "frequency" | "dayOfMonth" | "monthOfYear" | "startDate" | "endDate" | "lastHandledPeriod"
>;

export interface DuePeriod {
  period: string;
  date: DateStr;
}

/** Most due periods returned at once (SPEC §13 cap). */
export const MAX_DUE = 12;

/** Guard against runaway loops (e.g. a start date far in the past): 100 years of months. */
const MAX_STEPS = 1200;

export function periodOf(frequency: Recurring["frequency"], date: DateStr): string {
  return frequency === "monthly" ? date.slice(0, 7) : date.slice(0, 4);
}

function nextPeriod(frequency: Recurring["frequency"], period: string): string {
  return frequency === "monthly" ? addMonthsStr(period, 1) : String(Number(period) + 1);
}

/** Last day of a period in either format, so a frequency change keeps working. */
function periodEnd(period: string): DateStr {
  return period.length === 4 ? `${period}-12-31` : monthRange(period).end;
}

/** Due date in a period; day 29–31 (and Feb 29) clamp to the month's last day. */
export function dueDateIn(schedule: Schedule, period: string): DateStr {
  const year = Number(period.slice(0, 4));
  const month =
    schedule.frequency === "monthly" ? Number(period.slice(5, 7)) : (schedule.monthOfYear ?? 1);
  return clampDay(year, month, schedule.dayOfMonth);
}

/**
 * Unhandled periods in order, oldest first. With `today`, only those due on or before it
 * (at most `limit`); without, the next ones regardless of date.
 */
export function upcomingPeriods(schedule: Schedule, today?: DateStr, limit = MAX_DUE): DuePeriod[] {
  const handledThrough = schedule.lastHandledPeriod ? periodEnd(schedule.lastHandledPeriod) : null;
  const from =
    handledThrough && handledThrough > schedule.startDate ? handledThrough : schedule.startDate;
  const result: DuePeriod[] = [];
  let period = periodOf(schedule.frequency, from);
  for (let step = 0; step < MAX_STEPS && result.length < limit; step++) {
    const date = dueDateIn(schedule, period);
    if (today && date > today) break;
    if (schedule.endDate && date > schedule.endDate) break;
    if (date >= schedule.startDate && (!handledThrough || date > handledThrough)) {
      result.push({ period, date });
    }
    period = nextPeriod(schedule.frequency, period);
  }
  return result;
}

/** Periods due on or before `today` that haven't been added or skipped (max `MAX_DUE`). */
export function duePeriods(schedule: Schedule, today: DateStr): DuePeriod[] {
  return upcomingPeriods(schedule, today);
}

/** The next unhandled due date (may be in the past if overdue), or null if the schedule ended. */
export function nextDueDate(schedule: Schedule): DateStr | null {
  return upcomingPeriods(schedule, undefined, 1)[0]?.date ?? null;
}

/** True if handling `period` moves the mark forward (never backward). */
export function isAfterHandled(lastHandledPeriod: string | null, period: string): boolean {
  return !lastHandledPeriod || periodEnd(period) > periodEnd(lastHandledPeriod);
}
