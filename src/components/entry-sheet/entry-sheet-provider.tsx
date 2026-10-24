"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { DuePeriod } from "@/lib/recurring";
import type { EntryType, Recurring, Transaction } from "@/types";
import { EntrySheet } from "./entry-sheet";

export type EntrySheetTarget =
  | { mode: "add"; type?: EntryType }
  | { mode: "edit"; transaction: Transaction }
  /** A due recurring item, prefilled; saving adds it and marks the period handled. */
  | { mode: "due"; recurring: Recurring; due: DuePeriod };

interface EntrySheetContextValue {
  openAdd: (type?: EntryType) => void;
  openEdit: (transaction: Transaction) => void;
  openDue: (recurring: Recurring, due: DuePeriod) => void;
}

const EntrySheetContext = createContext<EntrySheetContextValue | null>(null);

/** Owns the add/edit drawer so any screen (tab bar, rows) can open it. */
export function EntrySheetProvider({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<EntrySheetTarget | null>(null);
  // New key per open, so the form starts fresh every time.
  const [session, setSession] = useState(0);

  const open = (next: EntrySheetTarget) => {
    setTarget(next);
    setSession((n) => n + 1);
  };

  return (
    <EntrySheetContext.Provider
      value={{
        openAdd: (type) => open({ mode: "add", type }),
        openEdit: (transaction) => open({ mode: "edit", transaction }),
        openDue: (recurring, due) => open({ mode: "due", recurring, due }),
      }}
    >
      {children}
      <EntrySheet key={session} target={target} onClose={() => setTarget(null)} />
    </EntrySheetContext.Provider>
  );
}

export function useEntrySheet(): EntrySheetContextValue {
  const ctx = useContext(EntrySheetContext);
  if (!ctx) throw new Error("useEntrySheet must be used inside <EntrySheetProvider>");
  return ctx;
}
