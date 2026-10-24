"use client";

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { CategorySheet, type CategorySheetTarget } from "@/components/categories/category-sheet";
import { CategoryIcon } from "@/components/category-icon";
import { TAB_BAR_SPACE } from "@/components/tab-bar";
import { Button } from "@/components/ui/button";
import { useCategoryMap } from "@/hooks/use-data";
import { moveCategory } from "@/lib/repo/categories";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { Category, EntryType, ID } from "@/types";

export default function CategoriesPage() {
  const categories = useCategoryMap();
  const [type, setType] = useState<EntryType>("expense");
  const [reordering, setReordering] = useState(false);
  const [sheet, setSheet] = useState<CategorySheetTarget | null>(null);

  if (!categories) return null;

  const live = [...categories.values()]
    .filter((c) => c.type === type && c.deletedAt === null)
    .sort((a, b) => a.order - b.order);
  const childrenOf = (id: ID) => live.filter((c) => c.parentId === id);
  const parents = live.filter((c) => c.parentId === null);
  // Reorder only among visible (non-archived) siblings; archived rows sit where they were.
  const visibleSiblings = (c: Category) =>
    live.filter((s) => s.parentId === c.parentId && !s.archived);

  const move = (id: ID, direction: -1 | 1) =>
    void moveCategory(id, direction).catch((error: unknown) => {
      console.error(error);
      toast.error(String(error));
    });

  const row = (c: Category, child: boolean) => {
    // A child of an archived parent is hidden from the picker too, so show it dimmed.
    const dimmed = c.archived || (!!c.parentId && !!categories.get(c.parentId)?.archived);
    const siblings = visibleSiblings(c);
    const index = siblings.findIndex((s) => s.id === c.id);
    return (
      <li key={c.id} className={cn("flex min-h-12 items-center", child && "pl-8")}>
        <button
          type="button"
          className="flex min-h-12 flex-1 items-center gap-3 px-4 text-left text-sm disabled:opacity-100"
          disabled={reordering}
          onClick={() => setSheet({ mode: "edit", category: c })}
        >
          <CategoryIcon name={c.icon} className={cn(dimmed && "opacity-40")} />
          <span className={cn("flex-1 truncate", dimmed && "text-muted-foreground")}>{c.name}</span>
          {c.archived && <span className="text-xs text-muted-foreground">{strings.archived}</span>}
          {!c.archived && c.systemKey && (
            <span className="text-xs text-muted-foreground">{strings.builtIn}</span>
          )}
          {!reordering && <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
        </button>
        {reordering && !c.archived && (
          <div className="flex pr-2">
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={`${strings.moveUp}: ${c.name}`}
              disabled={index <= 0}
              onClick={() => move(c.id, -1)}
            >
              <ChevronUp className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-11"
              aria-label={`${strings.moveDown}: ${c.name}`}
              disabled={index === siblings.length - 1}
              onClick={() => move(c.id, 1)}
            >
              <ChevronDown className="size-5" />
            </Button>
          </div>
        )}
      </li>
    );
  };

  return (
    <>
      <AppHeader
        left={
          <Button variant="ghost" size="icon" className="size-11" aria-label={strings.back} asChild>
            <Link href="/more/">
              <ChevronLeft className="size-5" />
            </Link>
          </Button>
        }
        title={strings.categories}
        right={
          <>
            {!reordering && (
              <Button
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={strings.addCategory}
                onClick={() => setSheet({ mode: "add", type })}
              >
                <Plus className="size-5" />
              </Button>
            )}
            <Button variant="ghost" className="h-11" onClick={() => setReordering((r) => !r)}>
              {reordering ? strings.done : strings.reorder}
            </Button>
          </>
        }
      />
      <main className={cn("space-y-4 p-4", TAB_BAR_SPACE)}>
        <div className="flex rounded-full bg-muted p-1" role="radiogroup" aria-label={strings.type}>
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              className={cn(
                "h-9 flex-1 rounded-full text-sm font-medium",
                type === t && "bg-background shadow-sm",
              )}
              onClick={() => setType(t)}
            >
              {t === "income" ? strings.income : strings.expense}
            </button>
          ))}
        </div>

        <ul className="divide-y rounded-xl border">
          {parents.flatMap((p) => [row(p, false), ...childrenOf(p.id).map((c) => row(c, true))])}
        </ul>
      </main>
      <CategorySheet target={sheet} onClose={() => setSheet(null)} />
    </>
  );
}
