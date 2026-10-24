"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CategoryPicker } from "@/components/category-picker/category-picker";
import { Money } from "@/components/money";
import { useMonth } from "@/components/month-provider";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/hooks/use-data";
import { displayExpr, evaluate, hasPendingOp, pressKey, type CalcKey } from "@/lib/calc";
import { formatMonth, todayStr, toMonthStr, toTimeStr } from "@/lib/dates";
import { isValidAmount, MAX_AMOUNT, toBahtString } from "@/lib/money";
import {
  addTransaction,
  deleteTransaction,
  restoreTransaction,
  updateTransaction,
} from "@/lib/repo/transactions";
import { ensurePersisted } from "@/lib/storage";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { DateStr, EntryType, ID } from "@/types";
import { AmountPad } from "./amount-pad";
import { DateChip } from "./date-chip";
import type { EntrySheetTarget } from "./entry-sheet-provider";

/** Satang → pad expression ("40", "12.5"); trailing zeros dropped. */
function toExpr(amount: number): string {
  return toBahtString(amount).replace(/\.?0+$/, "");
}

export const UNDO_MS = 5000;

export function showDeletedToast(id: ID) {
  toast(strings.entryDeleted, {
    duration: UNDO_MS,
    action: { label: strings.undo, onClick: () => void restoreTransaction(id) },
  });
}

interface EntrySheetProps {
  target: EntrySheetTarget | null;
  onClose: () => void;
}

export function EntrySheet({ target, onClose }: EntrySheetProps) {
  return (
    <Drawer
      open={target !== null}
      onOpenChange={(open) => !open && onClose()}
      repositionInputs={false}
    >
      <DrawerContent className="mx-auto h-[94dvh] max-w-lg data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[94dvh]">
        {target && <EntryForm target={target} onDone={onClose} />}
      </DrawerContent>
    </Drawer>
  );
}

function EntryForm({ target, onDone }: { target: EntrySheetTarget; onDone: () => void }) {
  const settings = useSettings();
  const { month, setMonth } = useMonth();
  const editing = target.mode === "edit" ? target.transaction : null;

  const [type, setType] = useState<EntryType>(
    editing?.type ?? (target.mode === "add" ? target.type : undefined) ?? "expense",
  );
  const [expr, setExpr] = useState(editing ? toExpr(editing.amount) : "");
  const [categoryId, setCategoryId] = useState<ID | null>(editing?.categoryId ?? null);
  const [date, setDate] = useState<DateStr>(editing?.date ?? todayStr());
  const [note, setNote] = useState(editing?.note ?? "");
  const [saving, setSaving] = useState(false);

  const amount = evaluate(expr);
  const pending = hasPendingOp(expr);
  const valid = amount !== null && isValidAmount(amount);
  const canSave = !pending && valid && categoryId !== null && !saving;

  const changeType = (next: EntryType) => {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
  };

  const resolve = () => {
    // "=": collapse the expression to its result (or clear it if ≤ 0).
    setExpr(amount !== null && amount > 0 && amount < MAX_AMOUNT ? toExpr(amount) : "");
  };

  const save = async (addAnother: boolean) => {
    if (!canSave || amount === null || categoryId === null || !settings) return;
    setSaving(true);
    try {
      const fields = { type, amount, categoryId, date, note: note.trim() };
      if (editing) await updateTransaction(editing.id, fields);
      else
        await addTransaction({
          ...fields,
          accountId: settings.defaultAccountId,
          time: toTimeStr(new Date()),
        });

      void ensurePersisted(); // no-op once granted
      const savedMonth = toMonthStr(date);
      if (savedMonth !== month) {
        toast(strings.savedTo(formatMonth(savedMonth, settings.yearFormat)), {
          action: { label: strings.goToMonth, onClick: () => setMonth(savedMonth) },
        });
      }
      if (addAnother) {
        setExpr("");
        setNote("");
        setCategoryId(null);
        toast(strings.saved, { duration: 1500 });
      } else {
        onDone();
      }
    } catch (error) {
      console.error(error);
      toast.error(strings.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    await deleteTransaction(editing.id);
    onDone();
    showDeletedToast(editing.id);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerTitle className="sr-only">
        {editing ? strings.editEntry : strings.addEntry}
      </DrawerTitle>
      <DrawerDescription className="sr-only">{strings.entrySheetHint}</DrawerDescription>

      <div className="flex items-center gap-2 px-4 pt-2">
        <div className="flex rounded-full bg-muted p-1" role="radiogroup" aria-label={strings.type}>
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              className={cn(
                "h-9 rounded-full px-4 text-sm font-medium",
                type === t && "bg-background shadow-sm",
                type === t && (t === "income" ? "text-emerald-600" : "text-red-600"),
              )}
              onClick={() => changeType(t)}
            >
              {t === "income" ? strings.income : strings.expense}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {editing && (
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label={strings.delete}
            onClick={remove}
          >
            <Trash2 className="size-5" />
          </Button>
        )}
      </div>

      <div className="px-4 pt-3 text-right" aria-live="polite">
        <p
          className={cn(
            "min-h-11 truncate text-4xl font-semibold tabular-nums",
            type === "income" ? "text-emerald-600" : "text-red-600",
            !expr && "text-muted-foreground",
          )}
          data-testid="amount-expr"
        >
          ฿{expr ? displayExpr(expr) : "0"}
        </p>
        <p className="h-5 text-sm text-muted-foreground">
          {pending && amount !== null && (
            <>
              = <Money value={amount} kind="neutral" unmasked />
            </>
          )}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3" data-vaul-no-drag>
        <CategoryPicker type={type} value={categoryId} onChange={setCategoryId} />
      </div>

      <div className="space-y-2 border-t px-4 py-2">
        {settings && <DateChip value={date} onChange={setDate} yearFormat={settings.yearFormat} />}
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={strings.notePlaceholder}
          aria-label={strings.note}
          className="h-11 text-base"
          enterKeyHint="done"
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
      </div>

      <div className="pb-[env(safe-area-inset-bottom)]">
        <AmountPad
          onKey={(key: CalcKey) => setExpr((e) => pressKey(e, key))}
          primaryLabel={pending ? "=" : strings.save}
          primaryDisabled={pending ? false : !canSave}
          onPrimary={() => (pending ? resolve() : void save(false))}
          onPrimaryLongPress={editing || pending ? undefined : () => void save(true)}
        />
      </div>
    </div>
  );
}
