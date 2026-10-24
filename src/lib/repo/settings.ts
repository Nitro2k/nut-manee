import { db } from "@/lib/db";
import { nowISO } from "@/lib/dates";
import type { PrivacySettings, Settings } from "@/types";

export const SETTINGS_ID = "settings";

export type SettingsChanges = Partial<Omit<Settings, "id" | "updatedAt" | "privacy">> & {
  privacy?: Partial<PrivacySettings>;
};

/** The settings row. Throws if the database hasn't been seeded. */
export async function getSettings(): Promise<Settings> {
  const settings = await db.settings.get(SETTINGS_ID);
  if (!settings) throw new Error("Settings missing: database not seeded");
  return settings;
}

/** Shallow merge, with `privacy` merged one level deep. */
export async function updateSettings(changes: SettingsChanges): Promise<Settings> {
  return db.transaction("rw", db.settings, async () => {
    const current = await getSettings();
    const next: Settings = {
      ...current,
      ...changes,
      privacy: { ...current.privacy, ...changes.privacy },
      updatedAt: nowISO(),
    };
    await db.settings.put(next);
    return next;
  });
}
