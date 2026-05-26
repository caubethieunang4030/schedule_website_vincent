# Learning Summit

K-12 school summit web app: multi-track scheduling (Lower/Middle/Upper), session register + capacity, QR check-in, feedback, tasks with Excel export, custom forms (replacing Google Forms), system-wide notifications. Built for ~600 concurrent users.

## Stack
- pnpm monorepo (artifacts/api-server, artifacts/summit, lib/db, lib/api-spec, lib/api-client-react)
- Backend: Express 5 + Drizzle ORM + Postgres, Clerk auth (`@clerk/express`) with .edu/.org allowlist
- Frontend: React + Vite + Tailwind v4 + shadcn/ui, wouter routing, Clerk React, TanStack Query
- API spec: OpenAPI → Orval codegen (zod schemas + react-query hooks)

## Auth
- Clerk middleware proxies `/api/clerk/*`. `lib/auth.ts` upserts users into `users` table on each request and enforces .edu/.org email allowlist (403 otherwise).
- Roles: `student | faculty | organizer | admin`. Faculty/organizer/admin can create tasks, forms, notifications, and check attendees in.

## Pages (artifacts/summit/src/pages/app)
- Dashboard, Schedule (track tabs), SessionDetail (register, QR, scan, attendees, feedback), MySchedule, Tasks (Excel export), FormsList, FormBuilder, FormView (with responses tab), Notifications, Profile

## Seeding
Run from repo root:
```
node_modules/.pnpm/node_modules/.bin/tsx artifacts/api-server/src/scripts/seed.ts
```
Creates 3 users, 5 sessions, 3 tasks, 2 notifications, 1 form. Safe to re-run.

## Conventions
- Express 5 handlers must return `void`. Use `if (...) { res.status(...).json(...); return; }` — never `return res.json(...)`.
- For Drizzle `inArray(col, ids)` against text PKs, annotate `const ids: string[] = ...`.
- Mutations do NOT auto-invalidate. Always `qc.invalidateQueries({ queryKey: getXQueryKey() })` after `mutateAsync`.
- When passing `query.enabled` to a generated hook, also pass `queryKey: getXQueryKey(...)` to satisfy the generated TS type.
- Import schema types from `@workspace/api-client-react` (not via deep `/src/generated/...` paths).

## Secrets
SESSION_SECRET, DATABASE_URL, CLERK_SECRET_KEY, CLERK_PUBLISHABLE_KEY, VITE_CLERK_PUBLISHABLE_KEY.

## Admin/Faculty area (added April 2026)
- Routes gated to roles `faculty | organizer | admin` (admin always passes via `requireRole`).
- New tracks: `required_all` (red) and `teachers` (amber) — added to OpenAPI Track enum, SessionCard color map, and Schedule tabs.
- New table: `invited_students` (email unique). Roster import parses CSV/XLSX in the browser via `xlsx`, posts rows to `/api/students`, server dedupes with `onConflictDoNothing`. Registration status is computed by joining on lowercased email against `users.createdAt`.
- New endpoints: `GET/POST /students`, `DELETE /students/:id`, `GET /feedback/aggregate`.
- New pages: `AdminHome`, `AdminStudents`, `AdminFeedback`. Sidebar nav shows "Admin" only for privileged roles (driven by `useGetMe()`). Routes are also conditionally registered in `AppShell`.
- Logo: use `@assets/rabun-gap-logo-clear.png` (transparent). Vietnamese filenames break Vite — keep ASCII names.

## Codegen footgun
After `pnpm --filter @workspace/api-spec run codegen`, orval may regenerate `lib/api-zod/src/index.ts` to re-export both `./generated/api` and `./generated/types`, causing TS2308 duplicate-export errors. Fix: keep `lib/api-zod/src/index.ts` as a single line: `export * from "./generated/api";`.
