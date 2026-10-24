"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState } from "react";
import { db } from "@/lib/db";
import { formatBytes, getStorageInfo, type StorageInfo } from "@/lib/storage";
import { strings } from "@/lib/strings";

/** How much space the app uses, the entry count, and whether storage is persistent. */
export function StorageCard() {
  const entries = useLiveQuery(() => db.transactions.filter((t) => t.deletedAt === null).count());
  const [info, setInfo] = useState<StorageInfo | null>(null);

  // Re-measure when the entry count changes (estimate() isn't live).
  useEffect(() => {
    let cancelled = false;
    void getStorageInfo().then((next) => !cancelled && setInfo(next));
    return () => {
      cancelled = true;
    };
  }, [entries]);

  const used =
    info?.usage == null
      ? strings.storageUnknown
      : info.quota
        ? strings.storageOf(formatBytes(info.usage), formatBytes(info.quota))
        : formatBytes(info.usage);

  return (
    <section className="rounded-xl border">
      <h2 className="px-4 pt-3 text-sm font-medium text-muted-foreground">{strings.storage}</h2>
      <dl className="divide-y text-sm">
        <Row label={strings.storageUsed} value={info ? used : "…"} hint={strings.storageUsedHint} />
        <Row label={strings.entries} value={entries?.toLocaleString("en-US") ?? "…"} />
        <Row
          label={strings.storagePersisted}
          value={
            info ? (info.persisted ? strings.storagePersistedYes : strings.storagePersistedNo) : "…"
          }
          hint={info && !info.persisted ? strings.storagePersistedHint : undefined}
        />
      </dl>
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-4">
        <dt>{label}</dt>
        <dd className="text-right tabular-nums">{value}</dd>
      </div>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
