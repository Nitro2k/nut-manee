"use client";

import { format, getDaysInMonth } from "date-fns";
import { useId, useState } from "react";
import { toast } from "sonner";
import { CategoryPicker } from "@/components/category-picker/category-picker";
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
import { Switch } from "@/components/ui/switch";
import { todayStr } from "@/lib/dates";
import { isValidAmount, parseBaht, toBahtString } from "@/lib/money";
import {
  addRecurring,
  deleteRecurring,
  restoreRecurring,
  updateRecurring,
} from "@/lib/repo/recurring";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { DateStr, EntryType, ID, Recurring } from "@/types";

export type RecurringSheetTarget = { mode: "add" } | { mode: "edit"; recurring: Recurring };

/** Days a schedule can pick: 1–31 monthly (clamped per month later); yearly, that month's length (Feb 29 allowed). */
function maxDay(frequency: Recurring["frequency"], monthOfYear: number): number {
  return frequency === "monthly" ? 31 : getDaysInMonth(new Date(2028, monthOfYear - 1, 1));
}
/** Month names for the yearly picker ("January"…); 2026 is just any year. */
const MONTHS = Array.from({ length: 12 }, (_, i) => format(new Date(2026, i, 1), "MMMM"));

const selectClass = "h-11 w-full rounded-md border bg-transparent px-3 text-base";

export function RecurringSheet({
  target,
  onClose,
}: {
  target: RecurringSheetTarget | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto h-[94dvh] max-w-lg data-[vaul-drawer-direction=bottom]:mt-0 data-[vaul-drawer-direction=bottom]:max-h-[94dvh]">
        {target && (
          <RecurringForm
            key={target.mode === "edit" ? target.recurring.id : "add"}
            target={target}
            onDone={onClose}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function SegmentedToggle<T extends string>({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; className?: string }[];
  disabled?: boolean;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex rounded-full bg-muted p-1" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={disabled && value !== o.value}
          className={cn(
            "h-9 flex-1 rounded-full text-sm font-medium disabled:opacity-40",
            value === o.value && cn("bg-background shadow-sm", o.className),
          )}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function RecurringForm({ target, onDone }: { target: RecurringSheetTarget; onDone: () => void }) {
  const editing = target.mode === "edit" ? target.recurring : null;
  const ids = { name: useId(), amount: useId(), note: useId(), pause: useId() };

  const [type, setType] = useState<EntryType>(editing?.type ?? "expense");
  const [name, setName] = useState(editing?.name ?? "");
  const [amountText, setAmountText] = useState(
    editing ? toBahtString(editing.amount).replace(/\.00$/, "") : "",
  );
  const [categoryId, setCategoryId] = useState<ID | null>(editing?.categoryId ?? null);
  const [frequency, setFrequency] = useState<Recurring["frequency"]>(
    editing?.frequency ?? "monthly",
  );
  const [dayOfMonth, setDayOfMonth] = useState(editing?.dayOfMonth ?? 1);
  const [monthOfYear, setMonthOfYear] = useState(editing?.monthOfYear ?? 1);
  const [startDate, setStartDate] = useState<DateStr>(editing?.startDate ?? todayStr());
  const [note, setNote] = useState(editing?.note ?? "");
  const [paused, setPaused] = useState(editing ? !editing.active : false);
  const [busy, setBusy] = useState(false);

  const lastDay = maxDay(frequency, monthOfYear);
  const days = Array.from({ length: lastDay }, (_, i) => i + 1);
  // Changing month or frequency can shorten the list; keep the day inside it.
  const changeSchedule = (nextFrequency: Recurring["frequency"], nextMonth: number) => {
    setFrequency(nextFrequency);
    setMonthOfYear(nextMonth);
    setDayOfMonth((d) => Math.min(d, maxDay(nextFrequency, nextMonth)));
  };

  const amount = parseBaht(amountText);
  const validAmount = amount !== null && isValidAmount(amount);
  const canSave = !busy && name.trim() !== "" && validAmount && categoryId !== null && !!startDate;

  const changeType = (next: EntryType) => {
    if (next === type) return;
    setType(next);
    setCategoryId(null);
  };

  const save = async () => {
    if (!canSave || amount === null || categoryId === null) return;
    setBusy(true);
    try {
      const fields = {
        name: name.trim(),
        amount,
        categoryId,
        note: note.trim(),
        frequency,
        dayOfMonth,
        monthOfYear: frequency === "yearly" ? monthOfYear : null,
        startDate,
        endDate: null,
        active: !paused,
      };
      if (editing) await updateRecurring(editing.id, fields);
      else await addRecurring({ ...fields, type });
      onDone();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!editing) return;
    await deleteRecurring(editing.id);
    onDone();
    toast(strings.recurringDeleted, {
      description: strings.recurringKeepsEntries,
      action: { label: strings.undo, onClick: () => void restoreRecurring(editing.id) },
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader>
        <DrawerTitle>{editing ? strings.editRecurring : strings.addRecurring}</DrawerTitle>
        <DrawerDescription className="sr-only">{strings.recurringFormHint}</DrawerDescription>
      </DrawerHeader>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-2" data-vaul-no-drag>
        <SegmentedToggle
          label={strings.type}
          value={type}
          disabled={!!editing}
          onChange={changeType}
          options={[
            { value: "expense", label: strings.expense, className: "text-red-600" },
            { value: "income", label: strings.income, className: "text-emerald-700" },
          ]}
        />

        <div className="space-y-2">
          <Label htmlFor={ids.name}>{strings.name}</Label>
          <Input
            id={ids.name}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            className="h-11 text-base"
            enterKeyHint="next"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor={ids.amount}>{strings.amount}</Label>
          <div className="relative">
            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
              ฿
            </span>
            <Input
              id={ids.amount}
              value={amountText}
              inputMode="decimal"
              onChange={(e) => setAmountText(e.target.value.replace(/[^\d.]/g, ""))}
              className="h-11 pl-7 text-base tabular-nums"
              aria-invalid={amountText !== "" && !validAmount}
              enterKeyHint="done"
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">{strings.category}</span>
          <CategoryPicker type={type} value={categoryId} onChange={setCategoryId} />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">{strings.repeats}</span>
          <SegmentedToggle
            label={strings.repeats}
            value={frequency}
            onChange={(f) => changeSchedule(f, monthOfYear)}
            options={[
              { value: "monthly", label: strings.monthly },
              { value: "yearly", label: strings.yearly },
            ]}
          />
          <div className="flex gap-2">
            {frequency === "yearly" && (
              <select
                className={selectClass}
                aria-label={strings.month}
                value={monthOfYear}
                onChange={(e) => changeSchedule(frequency, Number(e.target.value))}
              >
                {MONTHS.map((label, i) => (
                  <option key={label} value={i + 1}>
                    {label}
                  </option>
                ))}
              </select>
            )}
            <select
              className={selectClass}
              aria-label={strings.dayOfMonth}
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(Number(e.target.value))}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {frequency === "monthly" ? `${strings.dayOfMonth} ${d}` : d}
                </option>
              ))}
            </select>
          </div>
          {dayOfMonth > 28 && frequency === "monthly" && (
            <p className="text-xs text-muted-foreground">{strings.shortMonthHint}</p>
          )}
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">{strings.startsOn}</span>
          <input
            type="date"
            className={selectClass}
            value={startDate}
            required
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <div className="space-y-2">
          <Label htmlFor={ids.note}>{strings.note}</Label>
          <Input
            id={ids.note}
            value={note}
            placeholder={strings.notePlaceholder}
            onChange={(e) => setNote(e.target.value)}
            className="h-11 text-base"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </div>

        {editing && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor={ids.pause} className="text-base font-normal">
                  {strings.pause}
                </Label>
                <p className="text-xs text-muted-foreground">{strings.pauseHint}</p>
              </div>
              <Switch id={ids.pause} checked={paused} onCheckedChange={setPaused} />
            </div>
            <Button variant="outline" className="h-11 w-full text-destructive" onClick={remove}>
              {strings.deleteRecurring}
            </Button>
          </>
        )}
      </div>

      <DrawerFooter className="border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button className="h-11" disabled={!canSave} onClick={save}>
          {strings.save}
        </Button>
      </DrawerFooter>
    </div>
  );
}
