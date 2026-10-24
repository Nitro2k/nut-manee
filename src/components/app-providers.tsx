"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PrivacyProvider } from "@/components/privacy-provider";
import { ensureSeeded } from "@/lib/seed";
import { strings } from "@/lib/strings";

/** Seeds the database on first launch, then renders the app. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
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
  return <PrivacyProvider>{children}</PrivacyProvider>;
}
