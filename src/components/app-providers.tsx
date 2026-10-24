"use client";

import { useEffect, useState, type ReactNode } from "react";
import { EntrySheetProvider } from "@/components/entry-sheet/entry-sheet-provider";
import { MonthProvider } from "@/components/month-provider";
import { PrivacyProvider } from "@/components/privacy-provider";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { TabBar } from "@/components/tab-bar";
import { Toaster } from "@/components/ui/sonner";
import { ensureSeeded } from "@/lib/seed";
import { ensurePersisted, isStandalone } from "@/lib/storage";
import { strings } from "@/lib/strings";

/** Keeps toasts above the tab bar. */
const TOAST_OFFSET = { bottom: "calc(4.5rem + env(safe-area-inset-bottom))" };

/** Seeds the database on first launch, then renders the app shell. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    // Installed app: ask for persistent storage right away (also asked after the first save).
    if (isStandalone()) void ensurePersisted();
    ensureSeeded().then(
      () => setStatus("ready"),
      (error: unknown) => {
        console.error(error);
        setStatus("error");
      },
    );
  }, []);

  if (status === "loading") return null;
  if (status === "error") {
    return <p className="p-4 text-sm text-muted-foreground">{strings.loadError}</p>;
  }
  return (
    <PrivacyProvider>
      <MonthProvider>
        <EntrySheetProvider>
          {children}
          <TabBar />
          <ServiceWorkerRegister />
          <Toaster
            theme="light"
            position="bottom-center"
            offset={TOAST_OFFSET}
            mobileOffset={TOAST_OFFSET}
          />
        </EntrySheetProvider>
      </MonthProvider>
    </PrivacyProvider>
  );
}
