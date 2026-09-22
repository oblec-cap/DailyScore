# DailyScore

DailyScore is a local-first productivity PWA for planning workout and study tasks, recording partial completion, and learning from weekly progress.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/dailyscore run dev` — run the DailyScore web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/dailyscore/src/App.tsx` — app shell, navigation, screens, and local data actions
- `artifacts/dailyscore/src/lib/store.ts` — localStorage-backed task, completion, settings, and analytics model
- `artifacts/dailyscore/src/index.css` — DailyScore theme, responsive layout, and interaction styles
- `artifacts/dailyscore/public/manifest.webmanifest` — install metadata
- `artifacts/dailyscore/public/sw.js` — offline service worker

## Architecture decisions

- DailyScore is local-first and does not require an account or backend for personal use.
- Task completion is stored as actual amounts by date, not as a boolean, so partial completion remains measurable.
- Recurring tasks are materialized for the selected date from a reusable task definition.
- Analytics only compare dates with recorded task data; days before the user started are not treated as failures.

## Product

- Plan tasks in exactly two categories: Workout and Study & Others.
- Track partial progress with fast increment and 100% controls.
- Review daily, weekly, and historical performance with streaks, achievements, and data-based insights.
- Export/import local data and manage theme, reminders, notifications, and reset behavior in Settings.

## User preferences

The experience should remain simple, reliable, mobile-first, and productivity-focused rather than becoming a generic to-do app.

## Gotchas

The app uses browser APIs for localStorage, notifications, install prompts, and service-worker caching; these are progressively enhanced and may vary by browser.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
