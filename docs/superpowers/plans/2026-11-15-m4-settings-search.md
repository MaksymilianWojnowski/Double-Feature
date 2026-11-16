# Milestone 4: Settings, Filters, Providers, Search — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- The pair can set what the deck shows:
  - Content type and region (PL / BR).
  - Their streaming services (TMDB providers with logos) and "only on our services".
  - Genres, years, minimum rating, minimum votes, film runtime and original language.
- Either person can search TMDB and like a title directly.

**Architecture:**
- `/settings` is a server page that loads `pair_settings`, plus a client form that autosaves each change through the browser Supabase client (RLS: members may update those columns).
- The deck cursor is keyed by `settingsKey`, so any change restarts discover from page 1 automatically.
- Genres are a static map of UI keys to movie and TV genre ids (TMDB's two genre lists differ), with labels in `en.ts`.
- `/api/providers` and `/api/search` proxy TMDB with caching. Search results carry your own swipe state.

**Spec:** `docs/superpowers/specs/2026-11-15-double-feature-design.md` (requirements: `docs/brief.md`)

## Global Constraints

- Settings are shared by the pair. Every string goes in `en.ts`, genre and language names included.
- A liked search result goes through the same `swipe()` RPC as the deck, so matching and the match moment are identical.
- Provider logos credit JustWatch.

## Review Focus

1. **Genres with no TV equivalent** (Horror, Thriller, Romance) under "Both": the deck shows only films rather than ignoring the genre for series.
2. **Year from greater than year to:** the two values are swapped on save, not stored inverted.
3. **Switching region:** the provider list reloads, and chosen services that are also offered in the new region stay selected (provider ids are global).
4. **Searching for something already swiped:** the result shows your current decision. Liking it from search turns a pass into a like and can create a match.
5. **Typing fast:** search is debounced (300 ms), and a stale response never overwrites a newer one.

---

### Task 1: Genres + discover params
- [ ] `src/lib/deck/genres.ts`: `GENRES: Record<GenreKey, { movie: number[]; tv: number[] }>`.
- [ ] `Filters.genres` becomes `GenreKey[]`. `discoverParams` maps keys to that type's ids, joined with `|`. It returns `null` when genres are set but none exist for that type, and the deck route skips that type.
- [ ] Tests: a genre maps per type, horror-only gives `null` for TV, and an empty genre list doesn't filter.

### Task 2: Providers + search
- [ ] `mergeProviders(movie, tv, region)` (pure): dedup by id, sort by the region's display priority. Tested.
- [ ] `client.ts`:
  - `providers(region)`, cached for days.
  - `searchTitles(query)`: TMDB `search/multi`, films and series only, posters only, cached for hours.
- [ ] `/api/providers?region=`: public and CDN-cached.
- [ ] `/api/search?q=`: no-store. Each result carries `decision` from your own swipes.

### Task 3: Settings screen
- [ ] Grouped glass sections:
  - **What to show:** content type, region.
  - **Streaming:** a logo grid (top 24, "Show all"), plus an "only our services" switch.
  - **Filters:** genre chips, years (saved on blur, swapped if inverted), rating, votes, runtime (films), language.
- [ ] Autosave with a "Saved" status. A back button.

### Task 4: Search screen
- [ ] A glass search field with debounce and a request counter, so stale responses are dropped.
- [ ] Result rows show a poster thumb, title, year · type and a like button. Tapping a row opens the details sheet with Like.
- [ ] A like calls `swipe('like')` and shows the match moment when the RPC returns a match.

### Task 5: Wiring + verify
- [ ] Nav gets 4 tabs (Deck, Matches, Search, Pair).
- [ ] The deck gets a glass Filters button, and its empty state links to Settings.
- [ ] The Pair page gets a Settings row.
- [ ] Verify: run tests, lint and build, check visually, then commit.
