"use client";

import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { useCategoryMap, useRecentCategoryIds } from "@/hooks/use-data";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { Category, EntryType, ID } from "@/types";

interface CategoryPickerProps {
  type: EntryType;
  value: ID | null;
  onChange: (id: ID) => void;
}

function isPickable(c: Category, type: EntryType): boolean {
  return c.type === type && c.deletedAt === null && !c.archived;
}

/** Recent row + parent grid; a parent with children opens them plus a "General" tile for the parent itself. */
export function CategoryPicker({ type, value, onChange }: CategoryPickerProps) {
  const categories = useCategoryMap();
  const recentIds = useRecentCategoryIds(type);
  const [openParentId, setOpenParentId] = useState<ID | null>(null);

  if (!categories) return null;

  const pickable = [...categories.values()]
    .filter((c) => isPickable(c, type))
    .sort((a, b) => a.order - b.order);
  const parents = pickable.filter((c) => c.parentId === null);
  const childrenOf = (id: ID) => pickable.filter((c) => c.parentId === id);
  const recent = (recentIds ?? [])
    .map((id) => categories.get(id))
    .filter((c): c is Category => !!c && isPickable(c, type));
  const openParent = openParentId ? categories.get(openParentId) : undefined;

  const selectParent = (parent: Category) => {
    if (childrenOf(parent.id).length > 0) setOpenParentId(parent.id);
    else onChange(parent.id);
  };

  if (openParent) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          className="flex h-11 items-center gap-1 text-sm font-medium"
          onClick={() => setOpenParentId(null)}
        >
          <ChevronLeft className="size-5" />
          {openParent.name}
        </button>
        <div className="grid grid-cols-4 gap-2">
          <Tile
            category={openParent}
            label={strings.general}
            selected={value === openParent.id}
            onClick={() => onChange(openParent.id)}
          />
          {childrenOf(openParent.id).map((child) => (
            <Tile
              key={child.id}
              category={child}
              selected={value === child.id}
              onClick={() => onChange(child.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  const parentOfValue = value ? categories.get(value)?.parentId : null;

  return (
    <div className="space-y-3">
      {recent.length > 0 && (
        <div className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1">
          {recent.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(
                "flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm",
                value === c.id && "border-primary bg-primary text-primary-foreground",
              )}
              onClick={() => onChange(c.id)}
            >
              <CategoryIcon name={c.icon} className="size-4" />
              {c.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-4 gap-2">
        {parents.map((p) => (
          <Tile
            key={p.id}
            category={p}
            selected={value === p.id || parentOfValue === p.id}
            onClick={() => selectParent(p)}
          />
        ))}
      </div>
    </div>
  );
}

function Tile({
  category,
  label = category.name,
  selected,
  onClick,
}: {
  category: Category;
  label?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-18 flex-col items-center justify-center gap-1 rounded-lg border p-1 text-center text-xs leading-tight",
        selected && "border-primary bg-primary text-primary-foreground",
      )}
      onClick={onClick}
    >
      <CategoryIcon name={category.icon} />
      <span className="line-clamp-2 break-words">{label}</span>
    </button>
  );
}
