// Storage durability helpers (SPEC §10). Browser storage is "best effort" until persisted.

/** True when running as an installed Home Screen app. */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
}

/** True only in iOS Safari outside the Home Screen app (`navigator.standalone` is iOS-only). */
export function isIosSafariTab(): boolean {
  if (typeof window === "undefined") return false;
  return (navigator as Navigator & { standalone?: boolean }).standalone === false;
}

/**
 * Ask the browser not to evict our data under storage pressure. Safari decides by heuristics
 * (e.g. Home Screen install). Returns whether storage is persistent now.
 */
export async function ensurePersisted(): Promise<boolean> {
  if (!navigator.storage?.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export interface StorageInfo {
  /** Bytes used by this site (IndexedDB + offline app files); null if the browser won't say. */
  usage: number | null;
  /** Bytes the browser lets this site use; null if unknown. */
  quota: number | null;
  persisted: boolean;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const storage = navigator.storage;
  try {
    const [estimate, persisted] = await Promise.all([
      storage?.estimate?.() ?? Promise.resolve<StorageEstimate>({}),
      storage?.persisted?.() ?? Promise.resolve(false),
    ]);
    return { usage: estimate.usage ?? null, quota: estimate.quota ?? null, persisted };
  } catch {
    return { usage: null, quota: null, persisted: false };
  }
}

/** 1536 → "1.5 KB" (1024-based). */
export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${unit === 0 ? value : value.toFixed(1).replace(/\.0$/, "")} ${units[unit]}`;
}
