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
3. Under **Environment Variables**, add the variables from `.env.local` (the four required ones, plus the optional push keys). Then click **Deploy**.
4. Back in Supabase **Authentication → URL Configuration**: set **Site URL** to the Vercel URL (e.g. `https://double-feature.vercel.app`) and add `https://double-feature.vercel.app/**` to Redirect URLs.

Every later `git push` to `main` deploys automatically.

**Before your first real use, check:**
- [ ] All four env vars are set in Vercel. Without `SUPABASE_SECRET_KEY` the deck works but never mixes in your partner's likes.
- [ ] Every file in `supabase/migrations` has been run, in order (`0001` … `0006`).
- [ ] Supabase's Site URL and Redirect URLs include the deployed address.
- [ ] Both of you can sign in. Each can start swiping solo; one sends the invite link from the **Pair** tab, and titles you both liked turn into matches when the other joins.
- [ ] Set your services on **Settings** (the sliders icon on the deck).

### Optional extras (all free)

- **Match notifications (web push).** Generate keys once: `npx web-push generate-vapid-keys`. Add `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` to Vercel, redeploy. Each person then turns on **Pair → Match notifications** on their phone. On iPhone this only appears inside the app added to the Home Screen (iOS 16.4+).
- **Keep Supabase awake.** A free Supabase project pauses after a week without activity. `vercel.json` schedules a daily call to `/api/keepalive` that prevents it; nothing to set up. Optionally add `CRON_SECRET` (any long random string) in Vercel so only Vercel can call it.
- **Visitor stats.** Vercel → your project → **Analytics → Enable**. The app already sends page views (no cookies).
- **Weekly backups.** See [Backups](#backups).

### Connect your domain

1. Vercel → your project → **Settings → Domains → Add**. Enter your domain (e.g. `doublefeature.pl` or `watch.yourname.com`).
2. Vercel shows the DNS records to create: usually an **A** record for a root domain, or a **CNAME** for a subdomain. Add exactly those at your domain registrar.
3. Wait for Vercel to show the domain as **Valid** (minutes to a few hours). HTTPS is issued automatically.
4. In Supabase **Authentication → URL Configuration**: set **Site URL** to `https://your-domain` and add `https://your-domain/**` to Redirect URLs.

## 4. Install it on your phone

The app is an installable web app: it gets its own icon, opens full screen, and has no browser bars.

- **iPhone (Safari):** open the site, tap **Share → Add to Home Screen**.
  - Inside the installed app, sign in with the **code** from the email. That needs option B in the Supabase setup: an app on the Home Screen doesn't share Safari's login.
- **Android (Chrome):** open the site, tap **⋮ → Install app** (or **Add to Home screen**).

There's no offline mode: the deck needs the network for posters and titles.

## Languages

The UI speaks English, Polish, Portuguese (Brazil), Spanish, German, French and Italian. It follows the browser's language; anyone can change theirs on **Pair → Language**. Film titles and synopses from TMDB follow the same choice. URLs stay the same in every language. Sign-in emails come from Supabase's templates and are one language for everyone.

To add a language: copy `src/lib/strings/pl.ts`, translate it, then register it in `src/lib/strings/index.ts` and `src/lib/i18n/locales.ts`.

## Backups

`.github/workflows/db-backup.yml` dumps the database every Monday, encrypts it, and keeps it as a workflow artifact for 90 days. The repo is public, so the file is useless without your passphrase.

1. Supabase → **Connect** (top bar) → **Session pooler** → copy the URI and put your database password in it. (Not "Direct connection": GitHub's runners can't reach it.)
2. GitHub → repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL`: the URI from step 1.
   - `BACKUP_PASSPHRASE`: a long random password. Keep it in your password manager; without it the backups can't be opened.
3. **Actions → Database backup → Run workflow** once to check it works.

To restore: download the artifact, then `gpg -d backup-YYYY-MM-DD.tgz.gpg | tar xz` gives `roles.sql`, `schema.sql` and `data.sql`. Load them into a Supabase project with `psql` in that order, running `data.sql` with `SET session_replication_role = replica` (Supabase's guide: *Backup and Restore using the CLI*).

GitHub pauses scheduled workflows in a repo with no commits for 60 days; a push or a manual run turns it back on.

## Troubleshooting

- **The sign-in link opens a broken URL.** The redirect URL isn't in Supabase's Redirect URLs allowlist (step 4 of the Supabase setup), so Supabase fell back to the Site URL.
- **"That sign-in link didn't work."**
  - With default emails (option A), the link must be opened in the same browser that requested it.
  - Some email apps open links to scan them, which uses the link up. Request a new email, or use the code (option B).
- **Every page errors locally.** `.env.local` is missing values or still has the placeholders from `.env.example` (e.g. `your-project-ref`).
- **Files named `… 2.json` / `… 2.ts` appear, or `npm run dev` serves old code.** The project is in a folder synced by iCloud ("Desktop & Documents"). Move it somewhere unsynced, e.g. `~/Developer`.

## Project layout

```
src/app/[lang]/(app)/ signed-in screens: deck, matches, search, swipes, pair, settings
src/app/[lang]/       login, join/[code], onboarding, about; [lang] is the UI language (see proxy.ts)
src/app/              auth/confirm, icons + manifest (PWA)
src/app/api/          deck, titles, providers, search (the only places that talk to TMDB), push, keepalive
src/components/       deck/, details/, match/ (match moment + realtime), matches/, ui/
src/lib/deck/         deck builder, discover params, genre map
src/lib/tmdb/         server-only TMDB client (retry + cache), image URLs
src/lib/strings/      every user-facing string: en.ts is the source, one file per language
src/lib/i18n/         language detection (cookie, then browser), getT() / useT()
src/lib/push.ts       match notifications; public/sw.js shows them
src/proxy.ts          session refresh, sign-in gate, language rewrite
supabase/migrations/  SQL: tables, RLS, match trigger, RPCs
tests/                vitest; tests/db runs the migrations on PGlite
```

---

This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming availability data is provided by JustWatch.
