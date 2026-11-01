// Injected by next.config.ts at build time.
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
/** ISO time of the build (UTC on Vercel); shown in local time. Empty outside a Next build. */
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";
/** Short git commit the build came from, or "local". */
export const BUILD_COMMIT = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "local";
