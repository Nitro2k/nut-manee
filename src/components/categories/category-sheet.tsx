"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { ChevronLeft } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { CATEGORY_ICONS, CategoryIcon } from "@/components/category-icon";
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
import { useCategoryMap } from "@/hooks/use-data";
import {
  addCategory,
  categoryUsage,
  deleteCategory,
  mergeCategory,
  updateCategory,
} from "@/lib/repo/categories";
import { DEFAULT_CATEGORY_ICON } from "@/lib/seed-data";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";
import type { Category, EntryType, ID } from "@/types";

export type CategorySheetTarget =
  { mode: "add"; type: EntryType } | { mode: "edit"; category: Category };

const NAME_MAX = 40;
const ICON_NAMES = Object.keys(CATEGORY_ICONS);

const isActive = (c: Category) => c.deletedAt === null && !c.archived;

/** Active categories of one type in list order: each parent followed by its children. */
function treeOrder(categories: Map<ID, Category>, type: EntryType): Category[] {
  const live = [...categories.values()]
    .filter((c) => c.type === type && isActive(c))
    .sort((a, b) => a.order - b.order);
  return live
    .filter((c) => c.parentId === null)
    .flatMap((parent) => [parent, ...live.filter((c) => c.parentId === parent.id)]);
}

function showError(error: unknown) {
  console.error(error);
  toast.error(error instanceof Error ? error.message : String(error));
}

export function CategorySheet({
  target,
  onClose,
}: {
  target: CategorySheetTarget | null;
  onClose: () => void;
}) {
  return (
    <Drawer open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="mx-auto max-h-[94dvh] max-w-lg data-[vaul-drawer-direction=bottom]:max-h-[94dvh]">
        {target && (
          <CategoryForm
            key={target.mode === "edit" ? target.category.id : "add"}
            target={target}
            onDone={onClose}
          />
        )}
      </DrawerContent>
    </Drawer>
  );
}

function CategoryForm({ target, onDone }: { target: CategorySheetTarget; onDone: () => void }) {
  const editing = target.mode === "edit" ? target.category : null;
  const type = editing?.type ?? (target.mode === "add" ? target.type : "expense");
  const categories = useCategoryMap();
  const usage = useLiveQuery(
    () => (editing ? categoryUsage(editing.id) : undefined),
    [editing?.id],
  );
  const nameId = useId();
  const archiveId = useId();

  const [step, setStep] = useState<"form" | "delete">("form");
  const [name, setName] = useState(editing?.name ?? "");
  const [icon, setIcon] = useState(editing?.icon ?? DEFAULT_CATEGORY_ICON);
  const [parentId, setParentId] = useState<ID | null>(editing?.parentId ?? null);
  const [archived, setArchived] = useState(editing?.archived ?? false);
  const [busy, setBusy] = useState(false);

  if (!categories) return null;

  const hasChildren = (usage?.children ?? 0) > 0;
  const parents = [...categories.values()]
    .filter((c) => c.type === type && c.parentId === null && isActive(c) && c.id !== editing?.id)
    .sort((a, b) => a.order - b.order);
  const trimmed = name.trim();

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
      onDone();
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run(async () => {
      if (editing) {
        await updateCategory(editing.id, { name: trimmed, icon, parentId, archived });
      } else {
        await addCategory({ type, name: trimmed, icon, parentId });
      }
    });

  if (step === "delete" && editing) {
    return (
      <DeleteStep
        category={editing}
        categories={categories}
        busy={busy}
        onBack={() => setStep("form")}
        onDelete={(targetId) =>
          run(async () => {
            if (targetId) {
              const moved = await mergeCategory(editing.id, targetId);
              toast(strings.categoryMerged(moved, categories.get(targetId)?.name ?? ""));
            } else {
              await deleteCategory(editing.id);
              toast(strings.categoryDeleted);
            }
          })
        }
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DrawerHeader>
        <DrawerTitle>{editing ? strings.editCategory : strings.addCategory}</DrawerTitle>
        <DrawerDescription className="sr-only">{strings.categoryFormHint}</DrawerDescription>
      </DrawerHeader>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-2" data-vaul-no-drag>
        <div className="space-y-2">
          <Label htmlFor={nameId}>{strings.name}</Label>
          <Input
            id={nameId}
            value={name}
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            className="h-11 text-base"
            enterKeyHint="done"
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">{strings.parentCategory}</span>
          <select
            className="h-11 w-full rounded-md border bg-transparent px-3 text-base disabled:opacity-50"
            value={parentId ?? ""}
            disabled={hasChildren}
            onChange={(e) => setParentId(e.target.value || null)}
          >
            <option value="">{strings.noParent}</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {hasChildren && (
            <span className="block text-xs text-muted-foreground">{strings.hasSubcategories}</span>
          )}
        </label>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{strings.icon}</legend>
          <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label={strings.icon}>
            {ICON_NAMES.map((iconName) => (
              <button
                key={iconName}
                type="button"
                role="radio"
                aria-checked={icon === iconName}
                aria-label={iconName}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-lg border",
                  icon === iconName && "border-primary bg-primary text-primary-foreground",
                )}
                onClick={() => setIcon(iconName)}
              >
                <CategoryIcon name={iconName} />
              </button>
            ))}
          </div>
        </fieldset>

        {editing && (
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label htmlFor={archiveId} className="text-base font-normal">
                {strings.archive}
              </Label>
              <p className="text-xs text-muted-foreground">{strings.archiveHint}</p>
            </div>
            <Switch id={archiveId} checked={archived} onCheckedChange={setArchived} />
          </div>
        )}

        {editing &&
          (editing.systemKey ? (
            <p className="text-xs text-muted-foreground">{strings.builtInHint}</p>
          ) : (
            <Button
              variant="outline"
              className="h-11 w-full text-destructive"
              onClick={() => setStep("delete")}
            >
              {strings.deleteCategory}
            </Button>
          ))}
      </div>

      <DrawerFooter className="border-t pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <Button className="h-11" disabled={busy || !trimmed} onClick={save}>
          {trimmed ? strings.save : strings.nameRequired}
        </Button>
      </DrawerFooter>
    </div>
  );
}

function DeleteStep({
  category,
  categories,
  busy,
  onBack,
  onDelete,
}: {
  category: Category;
  categories: Map<ID, Category>;
  busy: boolean;
  onBack: () => void;
  /** `targetId` = merge into it first; null = plain delete (unused category). */
  onDelete: (targetId: ID | null) => void;
}) {
  const usage = useLiveQuery(() => categoryUsage(category.id), [category.id]);
  const [targetId, setTargetId] = useState<ID | "">("");

  const targets = treeOrder(categories, category.type).filter(
    (c) => c.id !== category.id && c.parentId !== category.id,
  );
  const label = (c: Category) => {
    const parent = c.parentId ? categories.get(c.parentId) : undefined;
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };

  return (
    <>
      <DrawerHeader>
        <DrawerTitle>{strings.deleteCategoryTitle(category.name)}</DrawerTitle>
        <DrawerDescription>
          {!usage
            ? "…"
            : usage.children > 0
              ? strings.deleteHasChildren
              : usage.entries > 0
                ? strings.deleteUsed(usage.entries)
                : strings.deleteUnused}
        </DrawerDescription>
      </DrawerHeader>
      {usage && usage.children === 0 && usage.entries > 0 && (
        <div className="px-4">
          <select
            className="h-11 w-full rounded-md border bg-transparent px-3 text-base"
            value={targetId}
            aria-label={strings.pickCategory}
            onChange={(e) => setTargetId(e.target.value)}
          >
            <option value="" disabled>
              {strings.pickCategory}
            </option>
            {targets.map((c) => (
              <option key={c.id} value={c.id}>
                {label(c)}
              </option>
            ))}
          </select>
        </div>
      )}
      <DrawerFooter className="pb-[calc(1rem+env(safe-area-inset-bottom))]">
        {usage && usage.children === 0 && (
          <Button
            variant="destructive"
            className="h-11"
            disabled={busy || (usage.entries > 0 && !targetId)}
            onClick={() => onDelete(usage.entries > 0 ? targetId || null : null)}
          >
            {usage.entries > 0 ? strings.moveAndDelete : strings.deleteCategory}
          </Button>
        )}
        <Button variant="ghost" className="h-11" disabled={busy} onClick={onBack}>
          <ChevronLeft className="size-4" />
          {strings.back}
        </Button>
      </DrawerFooter>
    </>
  );
}
