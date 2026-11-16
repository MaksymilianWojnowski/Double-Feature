# Project: Double Feature — original brief

Build a mobile-first web app where two people swipe through movies and TV series independently, and the app surfaces "matches" — titles both want to watch. It must be deployable as a real website from day one (not a local-only prototype). UI language: English, but keep all user-facing strings in one place so Polish can be added later.

## Stack
- Next.js (App Router) + TypeScript, deployed on Vercel
- Supabase: Postgres, Auth (email magic link), Realtime, Row Level Security
- TMDB API v3 as the only data source. The TMDB key must NEVER reach the browser — proxy all TMDB calls through Next.js route handlers, with response caching (titles/details change rarely; cache aggressively, e.g. 24h for details, 1h for discover pages).
- Styling: Tailwind CSS. No component library that makes it look generic (no default shadcn look). Framer Motion for swipe physics.
- Installable PWA (manifest, icons, standalone display).
- `.env.example` with every variable documented.

## Core concepts
- **User**: signs in with a magic link.
- **Pair**: exactly two users. One user creates a pair and gets an invite link/code; the other joins with it. All swipes and matches belong to a pair.
- **Swipe**: (user, pair, tmdb_id, media_type, decision: like | pass | seen) — unique per user+title.
- **Match**: created when both members of a pair have liked the same title. Detect it server-side (Postgres trigger or a transactional check), never trust the client.

## Features

### Onboarding / settings (per pair, editable later)
- Region for streaming availability (default PL, quick switch to BR).
- Our streaming services (pick from TMDB watch providers for the chosen region, show logos).
- Toggle: "Only show titles on our services" vs. "Show everything".
- Content type: Movies / Series / Both.

### Deck (the main screen)
- Cards built from TMDB `discover` (movie and tv), with filters: type, genres, year range, minimum TMDB rating, minimum vote count (to avoid obscure junk), runtime range for movies, original language.
- Never show a title the current user has already swiped.
- **Partner boost**: mix titles the partner has liked (but I haven't swiped yet) into my deck at a higher frequency, without revealing that they liked them. Keep the ratio configurable in code (start around 1 in 4 cards).
- Preload the next few cards and their posters so swiping never waits on the network.
- Card front: full-bleed poster, title, year, type (Movie / Series), runtime or number of seasons, TMDB rating, provider logos for our region.
- Tap the card → details sheet: overview, genres, director/creator, top cast, trailer (YouTube via TMDB videos, opens in a modal), "where to watch" list, link to the TMDB page.
- Actions: swipe right = Like, left = Pass, plus a third button "Seen it" (excluded forever, not counted as like/pass). Undo for the last swipe.
- Gestures: drag with spring physics, rotation proportional to drag, a subtle LIKE/PASS indicator that fades in with drag distance, threshold + velocity based decision, haptic feedback (`navigator.vibrate`) where supported.
- Desktop: keyboard shortcuts ← pass, → like, ↓ seen it, Z undo, Space open details.
- Empty state when the filters exhaust the results: suggest loosening filters.

### Matches
- When a match happens (including in real time when the partner's swipe creates it — Supabase Realtime), show a short, restrained match moment: the poster with "It's a match" and two buttons: "View" / "Keep swiping". No confetti, no emoji explosions.
- Matches list: grid of posters, filter by type and by "available on our services", sort by newest match / rating / runtime.
- Each match can be marked "Watched" (with an optional 1–5 rating from each of us), or removed.
- A "Tonight" helper: pick one random unwatched match, optionally filtered by max runtime, with a "Pick another" button.

### Search
- Search TMDB by title and like a title directly (counts as my swipe).

### Pair page
- Partner's name, invite link (before they join), basic stats (titles swiped each, number of matches, watched count). Leave the pair (with confirmation).

## Design direction — minimal, not AI slop
- The poster is the hero. The UI should recede: thin type, lots of negative space, almost no chrome.
- Dark theme by default (cinema feel): near-black background (not pure #000), off-white text, ONE accent colour used sparingly (e.g. a warm amber, used only for "like" and the match moment). Pass/neutral states are greys, not red.
- Typography: one characterful display face for titles (e.g. Instrument Serif or Fraunces) paired with a clean sans for UI (e.g. Geist or Inter Tight). A strict type scale; no more than 3 sizes per screen.
- Explicitly avoid: purple/blue gradients, glassmorphism, glowing shadows, emoji in UI, rounded-everything bubbly cards, generic dashboard layouts, stock icon soup. Use a single consistent icon set (Lucide), thin stroke, only where an icon is clearer than a word.
- Motion has a purpose: swipe physics, sheet transitions, the match moment. Respect `prefers-reduced-motion`.
- Mobile-first (one-handed use: primary actions in the thumb zone, safe-area insets), but looks deliberate on desktop too (centered deck, not stretched).
- Accessibility: buttons for every gesture action, visible focus states, sufficient contrast, alt text from titles.

## Data & security
- Supabase tables: profiles, pairs, pair_members, swipes, matches, pair_settings. Store only tmdb_id + media_type + minimal cached display fields (title, poster_path, year) — fetch the rest from TMDB.
- RLS: a user can read/write only data of pairs they belong to; a pair cannot have more than 2 members.
- SQL migrations in the repo (`supabase/migrations`), runnable from scratch.

## Legal / attribution
- Show the TMDB logo and the line "This product uses the TMDB API but is not endorsed or certified by TMDB." on an About screen/footer. Provider data comes from JustWatch via TMDB — credit JustWatch where provider logos appear.

## Quality
- Unit tests for the matching logic and the deck builder (dedup, partner boost, filters).
- Handle TMDB rate limits and errors gracefully (retry with backoff on the server, friendly empty/error states in UI).
- Lighthouse: aim for 90+ on performance and accessibility on mobile.

## Deliverables
1. Working app locally (`npm run dev`) against a Supabase project.
2. README with setup steps (TMDB key, Supabase project, env vars, running migrations) and a step-by-step guide to deploy on Vercel + connect the domain.
3. After milestone 1, a short list of manual steps (create accounts, paste keys).

Milestones: (1) scaffold + auth + pairs + schema, (2) TMDB proxy + deck + swiping, (3) matches + realtime, (4) settings/filters/providers + search, (5) design polish + PWA + deploy.
