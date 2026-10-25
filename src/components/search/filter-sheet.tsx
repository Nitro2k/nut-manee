"use client";

import { useState } from "react";
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
import { parseBaht, toBahtString } from "@/lib/money";
import type { SearchFilters } from "@/lib/search";
import { strings } from "@/lib/strings";
import type { Category, EntryType, ID, Satang } from "@/types";

const fieldClass = "h-11 w-full rounded-md border bg-transparent px-3 text-base";

const toText = (amount: Satang | null) =>
  amount === null ? "" : toBahtString(amount).replace(/\.00$/, "");
const toAmount = (text: string) => (text.trim() === "" ? null : parseBaht(text));

/** Category, amount and date filters. Edits a draft; "Show results" applies it. */
export function FilterSheet({
  open,
  onOpenChange,
  filters,
  categories,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SearchFilters;
  categories: Map<ID, Category>;
  onApply: (filters: SearchFilters) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-lg">
        {open && (
          <FilterForm
            filters={filters}
            categories={categories}
            onApply={(next) => {
              onApply(next);
              onOpenChange(false);
            }}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function FilterForm({
  filters,
  categories,
  onApply,
}: {
  filters: SearchFilters;
  categories: Map<ID, Category>;
  onApply: (filters: SearchFilters) => void;
}) {
  const [categoryId, setCategoryId] = useState(filters.categoryId ?? "");
  const [min, setMin] = useState(toText(filters.minAmount));
  const [max, setMax] = useState(toText(filters.maxAmount));
  const [from, setFrom] = useState(filters.from ?? "");
  const [to, setTo] = useState(filters.to ?? "");

  const minAmount = toAmount(min);
  const maxAmount = toAmount(max);
  const valid =
    (min.trim() === "" || minAmount !== null) &&
    (max.trim() === "" || maxAmount !== null) &&
    (minAmount === null || maxAmount === null || minAmount <= maxAmount) &&
    (!from || !to || from <= to);

  // Categories of the selected type (both when "All"), each parent followed by its children.
  const types: EntryType[] = filters.type === "all" ? ["expense", "income"] : [filters.type];
  const live = [...categories.values()]
    .filter((c) => c.deletedAt === null)
    .sort((a, b) => a.order - b.order);
  const groups = types.map((type) => ({
    type,
    options: live
      .filter((c) => c.type === type && c.parentId === null)
      .flatMap((p) => [
        { id: p.id, label: p.name },
        ...live
          .filter((c) => c.parentId === p.id)
          .map((c) => ({ id: c.id, label: `${p.name} › ${c.name}` })),
      ]),
  }));

  const apply = () =>
    onApply({
      ...filters,
      categoryId: categoryId || null,
      minAmount,
      maxAmount,
      from: from || null,
      to: to || null,
    });

  const clear = () =>
    onApply({
      ...filters,
      categoryId: null,
      minAmount: null,
      maxAmount: null,
      from: null,
      to: null,
    });

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{strings.filters}</DrawerTitle>
        <DrawerDescription className="sr-only">{strings.filtersHint}</DrawerDescription>
      </DrawerHeader>
      <div className="space-y-5 px-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">{strings.category}</span>
          <select
            className={fieldClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">{strings.allCategories}</option>
            {groups.map((g) => (
              <optgroup key={g.type} label={g.type === "income" ? strings.income : strings.expense}>
                {g.options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{strings.amountRange}</legend>
          <div className="flex gap-2">
            <Input
              value={min}
              inputMode="decimal"
              placeholder={strings.minAmount}
              aria-label={strings.minAmount}
              onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))}
              className="h-11 text-base tabular-nums"
            />
            <Input
              value={max}
              inputMode="decimal"
              placeholder={strings.maxAmount}
              aria-label={strings.maxAmount}
              onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))}
              className="h-11 text-base tabular-nums"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{strings.dateRange}</legend>
          <div className="flex gap-2">
            <input
              type="date"
              className={fieldClass}
              aria-label={strings.from}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
            <input
              type="date"
              className={fieldClass}
              aria-label={strings.to}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
        </fieldset>
      </div>
      <DrawerFooter className="flex-row pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button variant="outline" className="h-11 flex-1" onClick={clear}>
          {strings.clearFilters}
        </Button>
        <Button className="h-11 flex-1" disabled={!valid} onClick={apply}>
          {strings.showResults}
        </Button>
      </DrawerFooter>
    </>
  );
}
