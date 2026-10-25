"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { EntryRow } from "@/components/home/entry-list";
import { Money } from "@/components/money";
import { PrivacyMenu } from "@/components/privacy-menu";
import { FilterSheet } from "@/components/search/filter-sheet";
import { TAB_BAR_SPACE } from "@/components/tab-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllTransactions, useCategoryMap, useSettings } from "@/hooks/use-data";
import { totals as sumTotals } from "@/lib/aggregate";
import { formatDayLabel, formatMonth, todayStr } from "@/lib/dates";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  groupByMonth,
  hasCriteria,
  searchTransactions,
  type MonthGroup,
  type SearchFilters,
} from "@/lib/search";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { EntryType, Transaction } from "@/types";

/** Rows rendered per "Show more" step (SPEC §7.4: paginate past 200). */
const PAGE = 200;

const TYPES: { value: EntryType | "all"; label: string }[] = [
  { value: "all", label: strings.all },
  { value: "expense", label: strings.expense },
  { value: "income", label: strings.income },
];

/** Month groups cut to `limit` rows in total; each month's totals still cover all its results. */
function limitGroups(groups: MonthGroup[], limit: number) {
  const out: (MonthGroup & { shown: Transaction[] })[] = [];
  let remaining = limit;
  for (const g of groups) {
    if (remaining <= 0) break;
    const shown = g.transactions.slice(0, remaining);
    remaining -= shown.length;
    out.push({ ...g, shown });
  }
  return out;
}

export default function SearchPage() {
  const settings = useSettings();
  const categories = useCategoryMap();
  const all = useAllTransactions();
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  // Typing stays responsive; the (possibly large) filter runs on the deferred value.
  const query = useDeferredValue(filters.query);

  if (!settings || !categories || !all) return null;

  const update = (changes: Partial<SearchFilters>) => {
    setFilters((f) => ({ ...f, ...changes }));
    setLimit(PAGE);
  };

  const changeType = (type: EntryType | "all") => {
    // A category of the other type would match nothing, so drop it.
    const category = filters.categoryId ? categories.get(filters.categoryId) : undefined;
    update({
      type,
      categoryId: category && type !== "all" && category.type !== type ? null : filters.categoryId,
    });
  };

  const active = { ...filters, query };
  const searching = hasCriteria(active);
  const results = searching ? searchTransactions(all, categories, active) : [];
  const total = sumTotals(results);
  const filterCount = activeFilterCount(filters);
  const today = todayStr();

  const groups = limitGroups(groupByMonth(results), limit);

  return (
    <>
      <AppHeader title={strings.search} right={<PrivacyMenu />} />
      <main className={TAB_BAR_SPACE}>
        <div className="space-y-3 p-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              placeholder={strings.searchPlaceholder}
              aria-label={strings.search}
              className="h-11 px-9 text-base [&::-webkit-search-cancel-button]:appearance-none"
              enterKeyHint="search"
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            />
            {filters.query && (
              <button
                type="button"
                className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted-foreground"
                aria-label={strings.clearSearch}
                onClick={() => update({ query: "" })}
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div
              className="flex flex-1 rounded-full bg-muted p-1"
              role="radiogroup"
              aria-label={strings.type}
            >
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={filters.type === t.value}
                  className={cn(
                    "h-9 flex-1 rounded-full text-sm font-medium",
                    filters.type === t.value && "bg-background shadow-sm",
                  )}
                  onClick={() => changeType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              className="h-11 shrink-0 gap-1.5 rounded-full"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              {strings.filters}
              {filterCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {filterCount}
                </span>
              )}
            </Button>
          </div>

          {searching && results.length > 0 && (
            <p
              className="flex justify-between px-1 text-sm text-muted-foreground"
              data-testid="result-summary"
            >
              <span>{strings.resultCount(results.length)}</span>
              {filters.type === "all" ? (
                <Money value={total.net} kind="net" />
              ) : (
                <Money
                  value={filters.type === "income" ? total.income : total.expense}
                  kind={filters.type}
                />
              )}
            </p>
          )}
        </div>

        {!searching ? (
          <p className="px-8 py-12 text-center text-sm text-muted-foreground">
            {strings.searchHint}
          </p>
        ) : results.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="font-medium">{strings.noMatches}</p>
            <p className="text-sm text-muted-foreground">{strings.noMatchesHint}</p>
          </div>
        ) : (
          <div>
            {groups.map((g) => (
              <section key={g.month} aria-label={formatMonth(g.month, settings.yearFormat)}>
                <h2 className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-[5] flex items-center justify-between border-b bg-muted/80 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
                  <span>{formatMonth(g.month, settings.yearFormat)}</span>
                  <Money value={g.totals.net} kind="net" />
                </h2>
                <ul className="divide-y">
                  {g.shown.map((t) => (
                    <li key={t.id}>
                      <EntryRow
                        transaction={t}
                        categories={categories}
                        dateLabel={formatDayLabel(t.date, settings.yearFormat, today)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {results.length > limit && (
              <div className="p-4">
                <Button
                  variant="outline"
                  className="h-11 w-full"
                  onClick={() => setLimit((l) => l + PAGE)}
                >
                  {strings.showMore}
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
      <FilterSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        categories={categories}
        onApply={(next) => update(next)}
      />
    </>
  );
}
