"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isValidAmount, parseBaht, toBahtString } from "@/lib/money";
import { setBudget } from "@/lib/repo/budgets";
import { strings } from "@/lib/strings";
import type { Category, Satang } from "@/types";

export interface BudgetSheetTarget {
  category: Category;
  limit: Satang | null;
}

export function BudgetSheet({
  target,
  onClose,
}: {
  target: BudgetSheetTarget | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-w-lg">
        {target && <BudgetForm key={target.category.id} target={target} onDone={onClose} />}
      </DrawerContent>
    </Drawer>
  );
}

function BudgetForm({ target, onDone }: { target: BudgetSheetTarget; onDone: () => void }) {
  const inputId = useId();
  const [text, setText] = useState(
    target.limit === null ? "" : toBahtString(target.limit).replace(/\.00$/, ""),
  );
  const [busy, setBusy] = useState(false);
  const limit = text.trim() === "" ? null : parseBaht(text);
  const valid = limit === null ? text.trim() === "" : isValidAmount(limit);

  const save = async (next: Satang | null) => {
    setBusy(true);
    try {
      await setBudget(target.category.id, next);
      onDone();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{strings.budgetFor(target.category.name)}</DrawerTitle>
        <DrawerDescription>{strings.budgetSheetHint}</DrawerDescription>
      </DrawerHeader>
      <div className="space-y-2 px-4">
        <Label htmlFor={inputId}>{strings.monthlyLimit}</Label>
        <div className="relative">
          <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">฿</span>
          <Input
            id={inputId}
            value={text}
            inputMode="decimal"
            placeholder={strings.noLimit}
            onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ""))}
            className="h-11 pl-7 text-base tabular-nums"
            aria-invalid={!valid}
            enterKeyHint="done"
            onKeyDown={(e) => e.key === "Enter" && valid && void save(limit)}
          />
        </div>
      </div>
      <DrawerFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button className="h-11" disabled={busy || !valid} onClick={() => save(limit)}>
          {strings.save}
        </Button>
        <Button variant="ghost" className="h-11" disabled={busy} onClick={() => save(null)}>
          {strings.noLimit}
        </Button>
      </DrawerFooter>
    </>
  );
}
