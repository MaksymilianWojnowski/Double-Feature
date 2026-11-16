# Double Feature

Two people swipe through films and series on their own. When both like the same title, it's a match.

Next.js 16 (App Router) on Vercel, Supabase (Postgres, Auth, Realtime, RLS), TMDB for all title data.

- Original brief: [`docs/brief.md`](docs/brief.md)
- Design decisions: [`docs/superpowers/specs/2026-11-15-double-feature-design.md`](docs/superpowers/specs/2026-11-15-double-feature-design.md)

---

## 1. One-time setup (about 15 minutes)

### TMDB

1. Create an account at [themoviedb.org](https://www.themoviedb.org/signup).
2. Go to **Settings → API** and request an API key (type: Developer, personal/non-commercial use).
3. Copy the **API Read Access Token** (the long one). It becomes `TMDB_ACCESS_TOKEN`.

### Supabase

1. Create a project at [supabase.com](https://supabase.com/dashboard). Pick a region near you (e.g. Frankfurt for Poland).
2. **Project Settings → API Keys.** Copy the Project URL, the **Publishable** key and the **Secret** key.
3. **Create the schema.** Open **SQL Editor** and run each file in [`supabase/migrations`](supabase/migrations) **in filename order** (`0001_…`, then `0002_…`, …): paste one, click **Run**, repeat. When a later milestone adds a file, run just that one.
   - Or use the CLI (no global install needed):
     ```bash
     npx supabase login
     ```
     ```bash
     npx supabase link --project-ref your-project-ref
     ```
     ```bash
     npx supabase db push
     ```
4. **Authentication → URL Configuration.**
   - **Site URL:** `http://localhost:3000` for now. Change it to your real domain once deployed.
   - **Redirect URLs:** add `http://localhost:3000/**`. After deploying, also add `https://your-domain/**` and `https://*.vercel.app/**` (preview deployments).
5. **Authentication → Emails → Templates.** Edit **both** "Confirm sign up" (first login) and "Magic link" (later logins). Set the body to:
   ```html
   <h2>Sign in to Double Feature</h2>
   <p>Your code: <strong>{{ .Token }}</strong></p>
   <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Or tap here to sign in</a></p>
   ```
   Why both a code and a link: an app installed on the iPhone home screen has its own storage, separate from Safari. A tapped link signs you in to Safari, not the app. Inside the installed app, type the code.

> **Email limits:** Supabase's built-in email sender only allows a few emails per hour. That's fine for two people, but repeated test logins can hit it. To lift it, add your own SMTP under **Authentication → Emails → SMTP Settings** (e.g. Resend's free tier).

### Local env

```bash
cp .env.example .env.local
```

Fill in the four values in `.env.local`. Each one is explained in [`.env.example`](.env.example).

## 2. Run it

```bash
npm install
```
```bash
npm run dev
```

Open http://localhost:3000.

```bash
npm test
```

The database tests run the real migration on an in-process Postgres (PGlite), so you don't need Docker or a Supabase project for them.

## 3. Deploy to Vercel

1. Push this repo to GitHub.
2. In [vercel.com/new](https://vercel.com/new), import the repo. The framework is detected automatically; leave the build settings as they are.
3. Under **Environment Variables**, add the same four variables from `.env.local`. Then click **Deploy**.
4. Back in Supabase **Authentication → URL Configuration**: set **Site URL** to the Vercel URL (e.g. `https://double-feature.vercel.app`) and add `https://double-feature.vercel.app/**` to Redirect URLs.

Every later `git push` to `main` deploys automatically.

### Connect your domain

1. Vercel → your project → **Settings → Domains → Add**. Enter your domain (e.g. `doublefeature.pl` or `watch.yourname.com`).
2. Vercel shows the DNS records to create: usually an **A** record for a root domain, or a **CNAME** for a subdomain. Add exactly those at your domain registrar.
3. Wait for Vercel to show the domain as **Valid** (minutes to a few hours). HTTPS is issued automatically.
4. In Supabase **Authentication → URL Configuration**: set **Site URL** to `https://your-domain` and add `https://your-domain/**` to Redirect URLs.

## Troubleshooting

- **The sign-in link opens a broken URL.** The redirect URL isn't in Supabase's Redirect URLs allowlist (step 4 of the Supabase setup), so Supabase fell back to the Site URL.
- **"That sign-in link has expired or was already used."** Some email apps open links to scan them, which uses the link up. Use the code instead.
- **Every page errors locally.** `.env.local` is missing or has empty values.

## Project layout

```
src/app/(app)/        signed-in screens that need a pair (deck, pair, …)
src/app/              login, auth/confirm, join/[code], onboarding
src/lib/strings/en.ts every user-facing string (add pl.ts with the same shape for Polish)
src/lib/supabase/     browser and server clients
src/proxy.ts          session refresh + sign-in gate
supabase/migrations/  SQL: tables, RLS, match trigger, pair RPCs
tests/                vitest; tests/db runs the migrations on PGlite
```

---

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data is provided by JustWatch.
