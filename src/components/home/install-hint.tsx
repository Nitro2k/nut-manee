"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Share, X } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { setMeta } from "@/lib/repo/meta";
import { isIosSafariTab } from "@/lib/storage";
import { strings } from "@/lib/strings";

const DISMISSED_KEY = "installHintDismissed";

const noSubscribe = () => () => {};

/** One-time hint in an iOS Safari tab: install to the Home Screen so data isn't cleared. */
export function InstallHint() {
  const inSafariTab = useSyncExternalStore(noSubscribe, isIosSafariTab, () => false);
  const dismissed = useLiveQuery(async () => !!(await db.meta.get(DISMISSED_KEY)), [], true);

  if (!inSafariTab || dismissed) return null;

  return (
    <div className="flex gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
      <Share className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="font-medium">{strings.installTitle}</p>
        <p className="text-muted-foreground">{strings.installBody}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="-mt-2 -mr-2 size-11 shrink-0"
        aria-label={strings.dismiss}
        onClick={() => void setMeta(DISMISSED_KEY, true)}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
