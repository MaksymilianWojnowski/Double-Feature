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
5. **Sign-in emails.** You have two options.

   **A. No setup: Supabase's default emails.** Nothing to change. You sign in by tapping the link, and you must open it **in the same browser you requested it from**. Limits:
   - The built-in sender allows only a few emails per hour.
   - An app installed on the iPhone Home Screen has its own storage, separate from Safari, so a tapped link signs in Safari, not the app.

   **B. Custom SMTP + a code in the email (about 10 minutes).** Supabase only lets you edit email templates once you use your own SMTP.
   1. Pick a sender:
      - **Gmail, no domain needed.** Best with a new Gmail account just for this app. Turn on 2-Step Verification, then create an App Password at myaccount.google.com/apppasswords.
      - **Resend**, once you own a domain.
   2. In **Authentication → Emails → SMTP Settings**, enter:
      - Gmail: host `smtp.gmail.com`, port `465`, username = the Gmail address, password = the 16-character App Password, sender = the same address.
      - Resend: the host, port and credentials from its dashboard.
   3. In **Authentication → Emails → Templates**, edit **both** "Confirm sign up" (first login) and "Magic link" (later logins). Set the body to:
      ```html
      <h2>Sign in to Double Feature</h2>
      <p>Your code: <strong>{{ .Token }}</strong></p>
      <p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Or tap here to sign in</a></p>
      ```

   With B, the link works in any browser, and the installed iPhone app signs in by typing the code. It also lifts the hourly email limit. The app handles both kinds of link, so you can start with A and switch to B later.

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
- **"That sign-in link didn't work."**
  - With default emails (option A), the link must be opened in the same browser that requested it.
  - Some email apps open links to scan them, which uses the link up. Request a new email, or use the code (option B).
- **Every page errors locally.** `.env.local` is missing values or still has the placeholders from `.env.example` (e.g. `your-project-ref`).

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
