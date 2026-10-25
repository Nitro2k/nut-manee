"use client";

import { Money } from "@/components/money";
import { useBalance } from "@/hooks/use-data";
import { strings } from "@/lib/strings";

/** All-time balance under the month summary; hidden by the "Balance" privacy switch. */
export function BalanceLine() {
  const balance = useBalance();
  if (balance === undefined) return null;
  return (
    <p
      className="flex items-baseline justify-between px-1 text-sm"
      title={strings.balanceHint}
      data-testid="balance"
    >
      <span className="text-muted-foreground">{strings.balance}</span>
      <Money value={balance} kind="balance" className="font-medium" />
    </p>
  );
}
