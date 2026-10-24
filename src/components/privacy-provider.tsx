"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { db } from "@/lib/db";
import { ALL_HIDDEN, isKindHidden, setPrivacyBlur, type MoneyKind } from "@/lib/privacy";
import { SETTINGS_ID } from "@/lib/repo/settings";
import type { PrivacySettings } from "@/types";

interface PrivacyContextValue {
  privacy: PrivacySettings;
  autoHideOnBackground: boolean;
  /** Whether settings mask this kind. A single amount can still be tapped to reveal it. */
  isMasked: (kind: MoneyKind) => boolean;
  /** Bumped when the app goes to the background; amounts revealed before that hide again. */
  hideEpoch: number;
}

const PrivacyContext = createContext<PrivacyContextValue | null>(null);

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const settings = useLiveQuery(() => db.settings.get(SETTINGS_ID), []);
  const privacy = settings?.privacy ?? ALL_HIDDEN;
  const autoHideOnBackground = settings?.autoHideOnBackground ?? true;
  const [hideEpoch, setHideEpoch] = useState(0);

  useEffect(() => {
    if (!autoHideOnBackground) return;
    const onVisibilityChange = () => {
      const hidden = document.visibilityState === "hidden";
      setPrivacyBlur(hidden);
      if (hidden) setHideEpoch((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      setPrivacyBlur(false);
    };
  }, [autoHideOnBackground]);

  const value: PrivacyContextValue = {
    privacy,
    autoHideOnBackground,
    isMasked: (kind) => isKindHidden(kind, privacy),
    hideEpoch,
  };
  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

export function usePrivacy(): PrivacyContextValue {
  const ctx = useContext(PrivacyContext);
  if (!ctx) throw new Error("usePrivacy must be used inside <PrivacyProvider>");
  return ctx;
}
