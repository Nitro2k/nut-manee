import type { ISODateTime, Settings } from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

export const SNOOZE_KEY = "backupReminderSnoozedUntil";
export const SNOOZE_MS = DAY_MS;

/**
 * Due when the last backup (or, if never backed up, the first launch) is at least
 * `backupReminderDays` old, and the reminder isn't snoozed. 0 days = reminders off.
 */
export function isBackupDue(
  settings: Pick<Settings, "backupReminderDays" | "lastBackupAt">,
  seededAt: ISODateTime | undefined,
  snoozedUntil: ISODateTime | undefined,
  now = Date.now(),
): boolean {
  if (settings.backupReminderDays <= 0) return false;
  if (snoozedUntil && Date.parse(snoozedUntil) > now) return false;
  const since = settings.lastBackupAt ?? seededAt;
  if (!since) return false;
  return now - Date.parse(since) >= settings.backupReminderDays * DAY_MS;
}
