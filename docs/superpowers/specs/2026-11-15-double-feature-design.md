# Double Feature — design

Requirements: [`docs/brief.md`](../../brief.md) (the original brief). This document records only the decisions made on top of it.

## Intent

Two people (a couple) swipe through films and series on their own. The app tells them what they both want to watch. Matches have to show up fast, which is why the partner boost exists. The app should feel like a quiet cinema lobby, not a dashboard.

**Anti-goals:** a UI that looks generated (gradients, glass, emoji, bubbly cards), a partner being able to see what the other liked before it's a match, and a TMDB key that reaches the browser.

## Approaches considered

| Area | Picked | Rejected and why |
|---|---|---|
| Platform | Next.js on Vercel + Supabase (as briefed) | Firebase: matching is relational and fits a Postgres trigger. Supabase Edge Functions for the TMDB proxy: that splits the deploy in two, and Next route handlers are already server-side. |
| Match detection | Postgres trigger on `swipes` | Route-handler check: a direct supabase-js insert would bypass it. A trigger can't be bypassed. |
| Partner boost | Computed in the deck route handler with the service-role key | Readable partner swipes via RLS: the partner's likes would sit in the browser's network tab. |
| DB tests | Vitest + PGlite (real Postgres in WASM, migrations applied to stubbed `auth`) | `supabase test db` / pgTAP: needs Docker. Mocked SQL: proves nothing. |

## Decisions (user-approved, 2026-11-15)

1. **Deck filters are shared by the pair.** They live in `pair_settings`, so both decks draw from the same pool and you get more matches.
2. **Leaving the pair dissolves it.** The pair row is deleted and everything cascades: members, settings, swipes, matches and ratings for both people. The confirmation says exactly this.
3. **Login sends a link and a 6-digit code in the same email.** iOS gives an installed PWA separate storage from Safari, so a tapped link signs you in to Safari, not the app. Inside the app you type the code instead. Links use the `token_hash` flow (`/auth/confirm`), not the PKCE code flow, so a link opened in a different browser still works.

## Assumptions (stated to the user, not objected to)

- A user is in at most one pair (`pair_members.user_id` is UNIQUE).
- "On our services" means TMDB monetization types `flatrate|free|ads`. Rent and buy are excluded.
- Undoing a like that created a match deletes that match. A match already marked watched survives.
- Posters load straight from `image.tmdb.org` in fixed sizes (w342/w500/w780 srcset), not through `next/image`. Vercel's image-optimization quota would run out on posters.
- Framer Motion is used through its current package name, `motion` (`motion/react`).
- Next 16's `cacheComponents` stays on, since it's the scaffold default and becomes mandatory in the next major. Session reads sit inside `<Suspense>`, and TMDB caching uses `'use cache'` + `cacheLife`.
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `TMDB_ACCESS_TOKEN` (the v4 read token, sent as a Bearer token to v3 endpoints). There's no site-URL variable: the client uses `location.origin`.
- Commit after each milestone. Push only when the user says so.

## Data model

All tables have RLS on. "Member" means `auth.uid()` is in `pair_members` for that `pair_id`.

| Table | Columns | Read | Write |
|---|---|---|---|
| `profiles` | `id uuid PK → auth.users ON DELETE CASCADE`, `display_name text`, `created_at` | self + partner | self |
| `pairs` | `id uuid PK`, `invite_code text UNIQUE` (8 chars, uppercase, no 0/O/1/I), `created_by uuid`, `created_at` | member | only via RPCs |
| `pair_members` | `pair_id → pairs CASCADE`, `user_id → profiles CASCADE UNIQUE`, `joined_at`, PK `(pair_id,user_id)` | member | only via RPCs |
| `pair_settings` | `pair_id PK → pairs CASCADE`, `region text 'PL'`, `provider_ids int[] '{}'`, `only_our_services bool false`, `content_type text 'both'` (movie/tv/both), `filters jsonb '{}'` | member | member (update) |
| `swipes` | `id bigint identity PK`, `pair_id → pairs CASCADE`, `user_id → profiles CASCADE`, `tmdb_id int`, `media_type text` (movie/tv), `decision text` (like/pass/seen), `title text`, `poster_path text`, `year int`, `created_at`, UNIQUE `(user_id,tmdb_id,media_type)` | **own rows only** | own rows, `pair_id` must be own pair |
| `matches` | `id bigint identity PK`, `pair_id → pairs CASCADE`, `tmdb_id`, `media_type`, `title`, `poster_path`, `year`, `created_at`, `watched_at timestamptz null`, UNIQUE `(pair_id,tmdb_id,media_type)` | member | member: update `watched_at`, delete. Insert only by the trigger. |
| `match_ratings` | `match_id → matches CASCADE`, `user_id → profiles CASCADE`, `rating smallint 1–5`, PK `(match_id,user_id)` | member | own rows |

`filters` jsonb shape (validated in app code): `{ genres?: number[], yearMin?: number, yearMax?: number, minRating?: number, minVotes?: number, runtimeMin?: number, runtimeMax?: number, language?: string }`.

### Server-side logic (SQL)

- `handle_swipe()`: an AFTER INSERT OR UPDATE OF decision trigger on `swipes`, `SECURITY DEFINER`. When `decision='like'` it takes `pg_advisory_xact_lock(hashtext(pair_id||':'||media_type||':'||tmdb_id))`, checks that the other member has a like, and inserts into `matches ON CONFLICT DO NOTHING`. The lock means two likes landing at the same moment can't both miss each other.
- `handle_unswipe()`: an AFTER DELETE trigger, plus UPDATE away from like. It deletes the pair's unwatched match for that title.
- `pair_members` BEFORE INSERT trigger: locks the pair row (`FOR UPDATE`) and raises `pair_full` when the pair already has 2 members.
- RPCs (`SECURITY DEFINER`, `search_path=''`): `create_pair() → pairs`, `join_pair(code text) → pairs` (normalizes upper/trim; raises `invalid_code`, `pair_full`, `already_paired`), `leave_pair() → void`, `pair_stats() → (my_swipes, partner_swipes, matches, watched)`.
- `handle_new_user()` trigger on `auth.users`: creates the `profiles` row.
- Realtime: `matches` is added to the `supabase_realtime` publication. RLS filters which events each user receives.

## App structure

```
src/app/(app)/        deck (/), matches, search, pair, settings: needs session + pair
src/app/              login, auth/confirm, join/[code], onboarding, about, manifest.ts
src/app/api/          deck, titles/[type]/[id], search, providers, matches
src/components/       deck/ details/ matches/ ui/
src/lib/tmdb/         server-only client: retry/backoff on 429/5xx (3 tries, honors Retry-After), revalidate 24h details / 1h discover
src/lib/deck/         buildDeck(): pure, unit-tested; PARTNER_BOOST_EVERY = 4
src/lib/supabase/     browser.ts, server.ts, admin.ts (service role, `server-only`)
src/lib/strings/en.ts every user-facing string; `t` object, typed so pl.ts must match
src/proxy.ts          Supabase session refresh (Next 16 renamed middleware → proxy)
supabase/migrations/  0001_init.sql …
tests/                vitest; tests/db uses PGlite
```

## Visual system (baseline set in M1, polished in M5)

- Background `#0d0d0c`, surface `#161614`, text `#eeeae2`, muted `#8a877f`, hairline `#2a2926`, accent amber `#e8a33d`. The accent is used only for like and the match moment.
- Display: Instrument Serif (titles). UI: Geist. Scale: 13 / 16 / 28 / 44 px, with at most 3 sizes per screen.
- Corners: 2px on cards and buttons. No shadows, no blur.

## Left to the builder

Component internals, exact copy wording (it all goes in `en.ts`), animation constants, the discover-page cursor strategy (per-user, client-side, keyed by a filters hash), and the TMDB response trimming.
