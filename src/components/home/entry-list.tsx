"use client";

import { CategoryIcon } from "@/components/category-icon";
import { showDeletedToast } from "@/components/entry-sheet/entry-sheet";
import { useEntrySheet } from "@/components/entry-sheet/entry-sheet-provider";
import { Money } from "@/components/money";
import { SwipeRow } from "@/components/swipe-row";
import { useCashbackTotals } from "@/hooks/use-data";
import { groupByDay } from "@/lib/aggregate";
import { formatDayLabel, todayStr } from "@/lib/dates";
import { deleteTransaction } from "@/lib/repo/transactions";
import { strings } from "@/lib/strings";
import type { Category, ID, Satang, Transaction, YearFormat } from "@/types";

interface EntryListProps {
  transactions: Transaction[];
  categories: Map<ID, Category>;
  yearFormat: YearFormat;
}

/** Entries grouped by day with sticky day headers and a daily net. */
export function EntryList({ transactions, categories, yearFormat }: EntryListProps) {
  const today = todayStr();
  const cashback = useCashbackTotals(
    transactions.filter((t) => t.type === "expense").map((t) => t.id),
  );
  return (
    <div>
      {groupByDay(transactions).map((group) => (
        <section key={group.date} aria-label={formatDayLabel(group.date, yearFormat, today)}>
          <h2 className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-[5] flex items-center justify-between border-b bg-muted/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
            <span>{formatDayLabel(group.date, yearFormat, today)}</span>
            <Money value={group.totals.net} kind="net" />
          </h2>
          <ul className="divide-y">
            {group.transactions.map((t) => (
              <li key={t.id}>
                <EntryRow transaction={t} categories={categories} cashback={cashback?.get(t.id)} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** One entry: icon, category (› child), note, amount. Tap to edit, swipe left to delete. */
export function EntryRow({
  transaction: t,
  categories,
  cashback,
  dateLabel,
}: {
  transaction: Transaction;
  categories: Map<ID, Category>;
  /** Total cashback linked to this expense (full price is still what counts). */
  cashback?: Satang;
  /** Shown before the note where rows aren't grouped by day (search results). */
  dateLabel?: string;
}) {
  const { openEdit } = useEntrySheet();
  const category = categories.get(t.categoryId);
  const parent = category?.parentId ? categories.get(category.parentId) : undefined;

  const remove = async () => {
    await deleteTransaction(t.id);
    showDeletedToast(t.id);
  };

  return (
    <SwipeRow onDelete={remove}>
      <div
        role="button"
        tabIndex={0}
        className="flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-2 text-left active:bg-muted"
        onClick={() => openEdit(t)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openEdit(t)}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <CategoryIcon name={category?.icon ?? ""} className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">
            {parent ? (
              <>
                {parent.name} <span className="text-muted-foreground">›</span> {category?.name}
              </>
            ) : (
              category?.name
            )}
          </span>
          {(dateLabel || t.note) && (
            <span className="block truncate text-xs text-muted-foreground">
              {[dateLabel, t.note].filter(Boolean).join(" · ")}
            </span>
          )}
          {cashback !== undefined && (
            <span className="block text-xs text-muted-foreground">
              {strings.cashbackLine} <Money value={cashback} kind="income" />
            </span>
          )}
        </span>
        <Money value={t.amount} kind={t.type} className="text-sm font-medium" />
      </div>
    </SwipeRow>
  );
}
