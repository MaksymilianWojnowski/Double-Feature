# Milestone 1: Scaffold, Auth, Pairs, Schema — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A deployable Next.js app where two people sign in by email (link or 6-digit code), one creates a pair, the other joins by invite link, and the full database schema (including match detection) is in place and tested.

**Architecture:** Next.js 16 App Router on Vercel, Supabase for auth and Postgres. All rules that matter (pair size, match creation, visibility) live in SQL: RLS, triggers and `SECURITY DEFINER` RPCs. The app calls RPCs and never enforces them itself.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, @supabase/ssr + supabase-js, Vitest, @electric-sql/pglite, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-15-double-feature-design.md` (requirements: `docs/brief.md`)

## Global Constraints

- Every user-facing string lives in `src/lib/strings/en.ts`.
- The TMDB key and the Supabase service-role key are server-only (`import 'server-only'`). They are never `NEXT_PUBLIC_*`.
- Migrations live in `supabase/migrations` and run from scratch on an empty Supabase project.
- No component library. Use Lucide icons at thin stroke (`strokeWidth={1.5}`).
- Dark theme tokens and fonts come from the spec's Visual system section.

## Review Focus

1. Invite link opened while signed out: after login the user lands back on `/join/[code]`. The `next` param is preserved, and only relative paths are allowed (no open redirect).
2. A third person opens a full pair's invite link: they get a friendly "This pair is already full" screen, not a 500.
3. A user who is already in a pair opens another invite: they're told to leave their current pair first.
4. Invite code typed in lowercase or with spaces: it still works.
5. A login link opened in a different browser than the one that requested it: sign-in still works (`token_hash` flow, not PKCE).

---

### Task 1: Scaffold

**Files:**
- Create: the project via `create-next-app` (src dir, App Router, Tailwind, TS, ESLint), `vitest.config.ts`, `src/lib/strings/en.ts`, `src/app/globals.css` (tokens), `src/app/layout.tsx` (fonts, dark bg, safe-area)
- Test: `tests/strings.test.ts`

**Interfaces:**
- Produces: `t` (typed nested object of strings), `Strings` type = `typeof t` (widened to string leaves).

- [ ] Scaffold into the repo root (`npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --turbopack --yes`).
- [ ] Install: `@supabase/ssr @supabase/supabase-js lucide-react server-only` and dev `vitest @electric-sql/pglite`. Add `"test": "vitest run"`.
- [ ] Fonts through `next/font/google`: Instrument Serif (400, plus italic) as `--font-display`, Geist as `--font-sans`. Tailwind v4 `@theme` tokens from the spec.
- [ ] Test `t.app.name === 'Double Feature'`. Run `npm test` and expect PASS. Run `npm run build` and expect success.

### Task 2: Schema migration + DB tests

**Files:**
- Create: `supabase/migrations/0001_init.sql`, `tests/db/supabase-stub.sql`, `tests/db/harness.ts`, `tests/db/pairs.test.ts`, `tests/db/matching.test.ts`, `tests/db/rls.test.ts`

**Interfaces:**
- Produces (SQL): the tables, triggers and RPCs exactly as in the spec's Data model. Error messages are raised as the exact strings `invalid_code`, `pair_full` and `already_paired`.
- Produces (tests): `makeDb(): Promise<{ db: PGlite, user(name): Promise<string /*uuid*/>, as<T>(uid, sql, params?) }>`. `as` runs inside a transaction with `set local role authenticated` and `request.jwt.claims` set.

- [ ] `supabase-stub.sql`: schema `auth`, table `auth.users(id uuid pk, email text, raw_user_meta_data jsonb)`, `auth.uid()` reading `current_setting('request.jwt.claims', true)::jsonb->>'sub'`, roles `anon`, `authenticated` and `service_role`, and `create publication supabase_realtime`.
- [ ] Write failing tests:
  - pairs: `create_pair` returns an 8-char code and the creator is a member. `join_pair(lower(code) || ' ')` works. A third user raises `pair_full`. A paired user calling `join_pair` raises `already_paired`. A bad code raises `invalid_code`. `leave_pair` deletes the pair and cascades to swipes and matches. `pair_stats` counts are correct.
  - matching: like+like creates one match. like+pass creates none. like+seen creates none. The same tmdb_id with a different media_type creates none. A different pair creates none. pass→like via upsert creates a match. Deleting a like removes an unwatched match and keeps a watched one. Liking twice still gives one match.
  - rls: a user sees only their own swipes, never the partner's. They can't see another pair's matches or settings. They can't insert a swipe into another pair. They can't insert into `matches` directly. They can read the partner's profile but not a stranger's.
- [ ] Run `npm test` and expect FAIL (no migration yet).
- [ ] Write `0001_init.sql` to the spec.
- [ ] Run `npm test` and expect all PASS.

### Task 3: Supabase clients, session proxy, login

**Files:**
- Create: `src/lib/supabase/{browser,server,admin}.ts`, `src/proxy.ts`, `src/lib/safe-next.ts`, `src/app/login/page.tsx`, `src/app/login/login-form.tsx`, `src/app/auth/confirm/route.ts`, `src/app/auth/signout/route.ts`, `src/lib/database.types.ts` (hand-written, minimal)
- Test: `tests/safe-next.test.ts`

**Interfaces:**
- Produces: `createClient()` (browser), `await createServerClient()` (server, cookies), `createAdminClient()` (service role, server-only), `safeNext(next: string | null | undefined): string`.

- [ ] Test `safeNext`: `'/join/ABC'` passes through. `null` gives `'/'`. `'https://evil.com'` gives `'/'`. `'//evil.com'` gives `'/'`. `'/\\evil.com'` gives `'/'`.
- [ ] Implement it and run the tests: PASS.
- [ ] Login form. Step 1: enter the email and call `signInWithOtp({ email, options: { emailRedirectTo: origin + '/auth/confirm?next=' + next } })`. Step 2: enter the 6-digit code and call `verifyOtp({ email, token, type: 'email' })`, then `router.replace(next)`.
- [ ] `/auth/confirm`: read `token_hash`, `type` and `next`, call `verifyOtp({ token_hash, type })`, then redirect to `safeNext(next)`. On error, redirect to `/login?error=link`.
- [ ] `proxy.ts`: the @supabase/ssr cookie refresh pattern. Unauthenticated requests to app routes redirect to `/login?next=<path>`.

### Task 4: Onboarding, join, pair page

**Files:**
- Create: `src/lib/pair.ts` (`getMyPair()`), `src/app/onboarding/page.tsx` + `actions.ts`, `src/app/join/[code]/page.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/page.tsx` (deck placeholder), `src/app/(app)/pair/page.tsx` + `leave-button.tsx`

**Interfaces:**
- Produces: `getMyPair(): Promise<{ pair: {id, invite_code}, me: Profile, partner: Profile | null } | null>`.

- [ ] Onboarding: set the display name (server action updates `profiles`), then a choice between "Create a pair" (`create_pair`) and "I have a code" (redirects to `/join/CODE`).
- [ ] `/join/[code]`: calls `join_pair` and redirects to `/` on success. On `pair_full`, `already_paired` or `invalid_code` it shows the matching friendly message from `t`.
- [ ] `(app)/layout.tsx`: no pair → `/onboarding`. No display name → `/onboarding`.
- [ ] Pair page: partner name, or the invite link with a copy button while the partner hasn't joined yet. `pair_stats`. A leave button with a confirm step that states everything will be deleted.

### Task 5: Docs + verify + commit

**Files:**
- Create: `README.md`, `.env.example`

- [ ] `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `TMDB_ACCESS_TOKEN`, each documented.
- [ ] README: setup (TMDB key, Supabase project, email template with `{{ .Token }}` and the `/auth/confirm` link, the redirect URL allowlist, running migrations via the SQL editor or `npx supabase db push`), dev, test, and deploy to Vercel + domain.
- [ ] Run `npm test` (PASS), `npm run lint` (clean) and `npm run build` (success).
- [ ] Commit `feat: milestone 1 — scaffold, auth, pairs, schema`.
