# NoMoney

A personal expense tracker, built for my own use. It runs as a Home Screen web app on iPhone and works fully offline.

- **Offline-first.** Data stays on the device (IndexedDB). The app works in airplane mode.
- **Private.** No accounts, no ads, no analytics, no tracking. A strict Content Security Policy blocks any request to other sites.
- **Beta (0.1.0).** Made for one person; things may change.

## Features

- **Fast entry:** calculator pad (`120+45−20`), recent categories, today/yesterday dates, notes in Thai or English.
- **Home:** month summary, entries grouped by day, swipe left to delete with Undo.
- **Privacy:** hide income, expense or totals as `฿ ••••`; tap an amount to reveal it. The app blurs when it goes to the background.
- **Categories:** two levels, editable icons, reorder, archive, merge when deleting.
- **Cashback:** a cashback field on any expense (credit card); reports show "expense after cashback".
- **Recurring:** monthly or yearly items appear as due cards on Home; nothing is added without a tap.
- **Budgets:** a monthly limit per category, with alerts at 80% and 100%.
- **Reports:** by month or year: category breakdown, change vs last month, 12-month trend, best and worst month.
- **Search:** notes, categories or amounts, with filters for type, category, amount and dates.
- **Backup:** JSON backup and restore (merge or replace), CSV export, and a reminder when a backup is due.
- **Year format:** Gregorian (2026) or Buddhist (2569).

## Back up your data

Everything lives in the browser on your phone. iOS can clear website data when storage runs low, so:

1. Use it from the **Home Screen**: in Safari, tap Share → Add to Home Screen. Data there is kept more reliably than in a normal tab.
2. **Back up regularly:** More → Backup & data → Back up now → Save to Files / iCloud Drive. The app reminds you every 7 days (adjustable).

## Development

Requires Node 24 and pnpm (the version is pinned in `package.json`).

```bash
pnpm install
pnpm dev          # dev server (the service worker is off in dev)
pnpm build        # static export to out/, plus a generated service worker
pnpm preview      # serve out/ locally
```

Checks:

```bash
pnpm typecheck
pnpm lint
pnpm format       # Prettier (pnpm format:check only checks)
pnpm test         # Vitest + fake-indexeddb
pnpm e2e          # Playwright, iPhone 15 profile (WebKit)
```

Other:

```bash
pnpm icons        # re-render the app icons from public/icons/icon.svg
```

## Stack

Next.js (App Router, static export), React, TypeScript (strict), Tailwind CSS v4, shadcn/ui, Dexie (IndexedDB), zod, date-fns, Vitest, Playwright. Fonts are self-hosted (Noto Sans Thai), and charts are plain HTML/CSS.

Money is stored as integer satang (1 baht = 100 satang), never as floating-point numbers.

## Deploy

Any static host works: deploy the `out/` folder. On Vercel, `vercel.json` sets the security headers (CSP, no-referrer) and caching, including `no-cache` on `sw.js` so updates are detected. The app shows "Update available · Reload" when a new version is deployed.

## Project layout

```
src/app/          screens: Home, Reports, Search, More (categories, recurring, budgets, backup)
src/components/   UI components (shadcn primitives in components/ui)
src/lib/          data layer (Dexie, repositories), money, dates, reports, search, backup
src/types/        shared types
scripts/          build helpers (service worker, icons)
e2e/              Playwright tests
```
