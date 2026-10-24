"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { todayStr, toMonthStr } from "@/lib/dates";
import type { MonthStr } from "@/types";

interface MonthContextValue {
  month: MonthStr;
  setMonth: (month: MonthStr) => void;
}

const MonthContext = createContext<MonthContextValue | null>(null);

/** The month Home shows. Shared so the entry sheet can offer "Go to month" after a save. */
export function MonthProvider({ children }: { children: ReactNode }) {
  const [month, setMonth] = useState(() => toMonthStr(todayStr()));
  return <MonthContext.Provider value={{ month, setMonth }}>{children}</MonthContext.Provider>;
}

export function useMonth(): MonthContextValue {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error("useMonth must be used inside <MonthProvider>");
  return ctx;
}
