# Milestone 3: Matches + Realtime — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A match shows a restrained "It's a match" moment, whether your swipe made it or your partner's (live, via Supabase Realtime). A Matches tab lists, filters and sorts matches, lets you mark them watched with a 1–5 rating each, or remove them, and has a "Tonight" picker.

**Architecture:**
- A client `MatchProvider` in the `(app)` layout subscribes to `INSERT` on `matches` for the pair. RLS decides delivery.
- The provider shows `MatchMoment` for both the deck's RPC result and realtime events, deduplicated by match id.
- `/matches` is a server page. It loads matches, ratings and settings, then enriches each match with cached TMDB details (rating, runtime, region providers) at a concurrency of 8.
- A client `MatchesView` does the filtering, sorting and mutations. Mutations go through the browser Supabase client under RLS, then `router.refresh()`.

**Tech Stack:** As M2. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-15-double-feature-design.md` (requirements: `docs/brief.md`; visual system: Liquid Glass section)

## Global Constraints

- Accent (`#ff9f0a`) only on like and the match moment. Destructive actions use `danger`.
- The match moment has no confetti or emoji: poster, "It's a match", View and Keep swiping. It springs in, and with reduced motion it only fades.
- All strings go in `en.ts`.

## Review Focus

1. **Your own swipe makes the match.** The RPC result and your own realtime INSERT both arrive. The moment shows once.
2. **A match arrives while you're on another tab.** The moment shows there too, and the Matches list refreshes.
3. **A rating before Watched.** Stars are only offered once a match is watched. Un-watching keeps the ratings.
4. **"On our services" with no services chosen.** The toggle is hidden rather than filtering everything out.
5. **Tonight with a max runtime.** Series (no runtime) and watched titles are excluded, and "Pick another" never repeats the current pick while alternatives exist.

---

### Task 1: List logic + `rate_match`

**Files:** Create `src/lib/matches.ts`, `supabase/migrations/0003_rate_match.sql`. Test `tests/matches.test.ts`, `tests/db/ratings.test.ts`.

**Interfaces:**
- `type MatchItem = Card & { id; createdAt; watchedAt: string | null; rating: number | null; runtime: number | null; seasons: number | null; onOurServices: boolean; myRating: number | null; partnerRating: number | null }`
- `viewMatches(items, { type: 'all' | MediaType; onOurServices: boolean; sort: 'newest' | 'rating' | 'runtime' }): MatchItem[]`: unwatched before watched, then by the sort (nulls last; runtime ascending).
- `pickTonight(items, { maxRuntime?: number; avoid?: string }, random = Math.random): MatchItem | null`
- SQL `rate_match(p_match_id bigint, p_rating smallint)`: security invoker. It upserts your rating, or deletes it when null.

- [ ] Tests:
  - Type and services filters.
  - Each sort, with nulls last.
  - Unwatched first.
  - Tonight excludes watched and runtime-less titles under a max.
  - Tonight avoids the previous pick.
  - Tonight returns null when empty.
  - `rate_match` upserts.
  - `rate_match` with null deletes.
  - Rating another pair's match is refused by RLS.

### Task 2: Match moment + realtime

**Files:** Create `src/components/match/match-provider.tsx`, `match-moment.tsx`. Modify `src/app/(app)/layout.tsx`, `src/components/deck/deck.tsx`, `en.ts`.

- [ ] `MatchProvider({ pairId, children })` exposes `useMatchMoment().show(match)`. It subscribes with `postgres_changes` INSERT `filter: pair_id=eq.<id>` after `realtime.setAuth(session token)`, shows each match id once, and calls `router.refresh()` on realtime events.
- [ ] `MatchMoment` is a native `<dialog>` with a blurred-poster backdrop, the poster springing in, "It's a match" in accent, and the title. View goes to `/matches?open=<key>`; Keep swiping closes it. Haptic `[12, 60, 12]`.

### Task 3: Matches page

**Files:** Create `src/app/(app)/matches/page.tsx`, `src/components/matches/matches-view.tsx`, `match-actions.tsx`, `tonight-sheet.tsx`, `src/components/ui/segmented.tsx`. Modify `nav.tsx` (Matches tab), `details-sheet.tsx` (`children` slot).

- [ ] Grid: 3 columns of posters. Watched ones are dimmed with a check. Controls: a segmented All/Films/Series, an "On our services" toggle (hidden without services), and a sort `<select>`. Empty state.
- [ ] Tapping a poster opens the details sheet with match actions: Watched toggle, your stars plus your partner's rating once watched, and Remove with an inline confirm.
- [ ] Tonight sheet: runtime chips (Any / 90m / 2h / 2½h), a big poster, Pick another, View.
- [ ] Verify: run `npm test`, lint and build, check visually with mocked data, then commit `feat: milestone 3 — matches + realtime`.
