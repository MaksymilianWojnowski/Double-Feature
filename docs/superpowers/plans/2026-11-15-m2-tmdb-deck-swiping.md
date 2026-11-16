# Milestone 2: TMDB Proxy, Deck, Swiping — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The main screen is a swipeable deck of films and series from TMDB, filtered by the pair's settings. It never repeats a title you've swiped, mixes in your partner's likes, and has a details sheet with a trailer.

**Architecture:** A server-only TMDB client (retry + `'use cache: remote'`) behind two route handlers. `/api/deck` builds a batch: discover pages filtered against your swipes, interleaved 1-in-4 with partner likes. Partner likes come from a service-role-only SQL function, so they never reach the browser as a list. `/api/titles/[type]/[id]` serves trimmed details (public data, CDN-cacheable). Swipes go straight from the browser to a `swipe()` RPC. The trigger from M1 does the matching, and the RPC returns the match if this swipe created it.

**Tech Stack:** As M1, plus `motion` (`motion/react`) for drag physics. Native `<dialog>` for the sheet and the trailer.

**Spec:** `docs/superpowers/specs/2026-11-15-double-feature-design.md` (requirements: `docs/brief.md`)

## Global Constraints

- The TMDB token is read only in `src/lib/tmdb/client.ts` (`import 'server-only'`).
- Cache: discover uses `cacheLife('hours')` (1h revalidate) and details use `cacheLife('days')` (24h revalidate). Both are `'use cache: remote'`.
- Retry: 3 attempts on 429/5xx/network error. Wait `Retry-After` seconds if present, else 300ms·2^attempt.
- Partner boost: `PARTNER_BOOST_EVERY = 4` in `src/lib/deck/config.ts`. Boost cards are identical in shape to discover cards.
- Posters: `<img>` from `image.tmdb.org` with a w342/w500/w780 srcset. Logos: w92.
- Strings go in `en.ts`. Accent color only on Like.

## Review Focus

1. **The partner's likes must not be inferable.** `/api/deck` responses carry no flag, order hint or field that differs between boost and discover cards.
2. **TMDB down or rate-limited.** The deck shows a friendly error with Retry, not a blank screen. Details failing leaves the card usable (no rating/providers yet).
3. **Filters exhaust results.** An empty state appears ("loosen filters"). There's no infinite fetch loop: the server stops at TMDB's `total_pages` (max 500) and walks at most 6 pages per request.
4. **Fast double input** (key held down, double tap on Like). Each card is decided once. The second press acts on the next card only after the first has left.
5. **Undo after a match.** Undoing a like that created a match removes the match (M1 trigger). Undo is only available for the last swipe.

---

### Task 1: TMDB client

**Files:** Create `src/lib/tmdb/fetch-retry.ts`, `src/lib/tmdb/client.ts`, `src/lib/tmdb/types.ts`, `src/lib/tmdb/images.ts`. Test `tests/fetch-retry.test.ts`.

**Interfaces:**
- `fetchWithRetry(url: string, init: RequestInit, opts?: { tries?: number; sleep?: (ms) => Promise<void> }): Promise<Response>`. Throws `TmdbError(status)` after the last attempt.
- `discover(type: MediaType, params: Record<string,string>): Promise<DiscoverPage>`, `details(type: MediaType, id: number): Promise<Details>` (all regions' providers kept, trimmed fields).
- `posterSrcSet(path)`, `posterSrc(path, size)`, `logoSrc(path)`.

- [ ] Tests: retries a 429 then succeeds, honoring `Retry-After: 2` (sleep called with 2000); retries a 503 three times then throws `TmdbError` with status 503; no retry on 404 (throws at once); retries a network `TypeError`.
- [ ] Implement it and run `npm test`: PASS.

### Task 2: Deck builder

**Files:** Create `src/lib/deck/config.ts`, `src/lib/deck/build-deck.ts`, `src/lib/deck/discover-params.ts`. Test `tests/deck.test.ts`.

**Interfaces:**
- `type Card = { key: string /* "movie:123" */; tmdbId: number; mediaType: MediaType; title: string; year: number | null; posterPath: string | null }`
- `buildDeck({ discovered, boost, swiped, every = PARTNER_BOOST_EVERY }): Card[]`: drops swiped and duplicate keys (boost wins), and puts a boost card at every `every`-th position (indices 3, 7, …) while any remain. Leftover boost cards go at the end.
- `discoverParams(settings: PairSettings, type: MediaType, page: number): Record<string,string>`
- `settingsKey(settings): string`: a short stable hash. Cursors from other settings are ignored.

- [ ] Tests:
  - Swiped titles are excluded from both lists.
  - A title in both lists appears once.
  - With 9 discovered and 3 boost, boost lands at indices 3 and 7, and the third boost card comes last.
  - With no boost, the deck equals the discovered list.
  - With no discovered, the deck is all boost.
  - `discoverParams`:
    - movie uses `primary_release_date.*` and `with_runtime.*`; tv uses `first_air_date.*` and no runtime.
    - The providers param is only present when `only_our_services` is on and `provider_ids` is non-empty (`8|119`, `watch_region`, `flatrate|free|ads`).
    - `vote_count.gte` defaults to 150, and `minRating` maps to `vote_average.gte`.
    - Genres are joined with `|`.
- [ ] Implement it and run the tests: PASS.

### Task 3: `swipe()` and `boost_candidates()` SQL

**Files:** Create `supabase/migrations/0002_swipe_and_boost.sql`. Modify `tests/db/harness.ts` (add `asService`). Test `tests/db/swipe.test.ts`.

**Interfaces:**
- `swipe(p_tmdb_id int, p_media_type text, p_decision text, p_title text, p_poster_path text = null, p_year int = null) returns setof matches`: upserts your swipe in your pair and returns the match only if this call created it. Raises `no_pair`. Executable by `authenticated`.
- `boost_candidates(p_user uuid, p_limit int = 40) returns table(tmdb_id, media_type, title, poster_path, year)`: the partner's likes that `p_user` hasn't swiped, newest first. Executable by `service_role` only.

- [ ] Tests:
  - `swipe` returns nothing on the first like and returns the match on the partner's like.
  - Re-liking an existing match returns nothing.
  - `swipe` without a pair raises `no_pair`.
  - `boost_candidates` as `authenticated` gives permission denied.
  - As `service_role` it returns the partner's likes minus your swipes, and never your own likes or other pairs' likes.
- [ ] Implement it and run `npm test`: PASS.

### Task 4: Route handlers

**Files:** Create `src/lib/supabase/admin.ts`, `src/app/api/deck/route.ts`, `src/app/api/titles/[type]/[id]/route.ts`.

- [ ] `GET /api/deck?key=&movie=&tv=` returns `{ cards: Card[], cursor: { key, movie, tv }, done: boolean, region: string }` with `Cache-Control: no-store`. It walks discover pages (both types in parallel, interleaved) until it has ≥ 20 unswiped cards, or 6 pages have been walked, or `total_pages` is reached. Boost comes from `boost_candidates` via the admin client and is skipped if `SUPABASE_SECRET_KEY` is unset. Responds 502 `{ error: 'tmdb' }` on `TmdbError`.
- [ ] `GET /api/titles/:type/:id?region=PL` validates input (400 otherwise) and returns `Details` with only that region's providers. `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`.

### Task 5: Deck UI

**Files:** Create `src/components/deck/deck.tsx`, `swipe-card.tsx`, `action-bar.tsx`, `use-deck.ts`. Modify `src/app/(app)/page.tsx`, `en.ts`, `eslint.config.mjs` (allow `<img>` for TMDB posters).

- [ ] `useDeck()`:
  - Holds the queue and dedups by key across fetches.
  - Fetches when fewer than 6 cards are left, and persists the request cursor in `localStorage` (try/catch).
  - Prefetches details plus posters for the next 4 cards.
  - `decide(decision)` is optimistic: on RPC error it puts the card back and shows an error.
  - `undo()` deletes the last swipe and puts the card back on top.
  - `onMatch` is a callback (the UI comes in M3).
- [ ] `SwipeCard`:
  - Drag on x with rotation `x/25` (max ±12°) and Like/Pass labels whose opacity follows |x| from 20 to 120px.
  - It decides when |offset| > 120 or |velocity| > 600. Exits use `AnimatePresence` with the decision direction (seen = down).
  - Calls `navigator.vibrate?.(8)`. Reduced motion means a fade only.
- [ ] Action bar in the thumb zone: Undo, Pass, Seen it, Like (accent). Keys: ← → ↓ Z Space (ignored while a dialog is open or an input has focus).
- [ ] States: loading (poster-shaped placeholder), error + Retry, and empty ("loosen filters").

### Task 6: Details sheet + trailer

**Files:** Create `src/components/details/details-sheet.tsx`, `trailer-dialog.tsx`.

- [ ] A native `<dialog>` bottom sheet showing: overview, genres, director/creator, top 6 cast, Trailer (button opens the YouTube-nocookie embed in a second `<dialog>`), where to watch (flatrate/free/ads first, then rent/buy, plus a "Provided by JustWatch" line), and a TMDB link.
- [ ] Verify: run `npm test`, `npm run lint` and `npm run build`, then check the deck in the browser with placeholder env (empty/error state renders). Commit `feat: milestone 2 — TMDB proxy, deck, swiping`.
