# Stride GH

Find road races across Ghana and running gear from local shops. Mobile-first web app.

> "Stride GH" is a working name. Change it in `src/lib/site.ts` (and the wordmark in `src/app/page.tsx`) when the brand is decided.

## Two apps, one project

- **Website** (this folder) — Next.js. Also serves the race data as an API at `/api/events`.
- **Mobile app** (`mobile/`) — Expo, opened with Expo Go on your phone. It reads from the website's API. See `mobile/README.md`.

To work on the phone app, run the website (`npm run dev` here) and Expo (`npx expo start` in `mobile/`) side by side in two terminals.

## What works today

- **Home** — next race with open registration, upcoming races, links into events and the shop.
- **Events** (`/events`) — search, distance chips, and more filters (when, where, entry fee). Filters live in the URL, so any filtered view can be shared on WhatsApp.
- **Race pages** (`/events/[slug]`) — poster slot, key facts, verification status, organiser, venue with map link, distances and fees, highlights, add to calendar, share, other races that month, and an official-registration button that always sends runners to the organiser's own page.
- **Saved** (`/saved`) — save races on this device, no account needed.
- **Light and dark mode** — follows the phone by default; toggle on Home, full control under Account.
- **List your race** (`/list` on the website, *Account → List your race* in the app) — organisers read how it works, then fill in the race, when and where, distances and fees, what's included, registration and their contact details. Answers are saved on the device as they go. They get a reference like `SGH-7KQ2MP` and can check its status at `/list/status` or *Your submissions* in the app.
- **Admin portal** (`/admin`, website only) — review queue, a checklist per race, approve and publish, ask for changes (the organiser edits and resubmits), or decline with a reason. *Live listings* lets you change a race's badge or hide it. See [Admin portal](#admin-portal).
- **Accounts in the app** — create an account with name, email and phone (with country code). There's no password: we email a 6-digit code to confirm the address, and the same kind of code signs in on a new phone. See [Accounts and email codes](#accounts-and-email-codes).
- **Shop** (`/shop`, the Shop tab in the app) — local running shops and their products: shop pages with location, hours, delivery, payment methods and WhatsApp/call buttons; product pages with sizes, colours and stock, and an "Ask the shop on WhatsApp" message with the chosen size filled in. No online payment yet. Shops live in `data/stores.seed.json` — see `data/STORES.md` for how to add one, and `public/stores/README.md` for photos. The three shops there now are made-up samples, labelled as such.

Race data comes from `data/events.seed.json` (the community Ghana Race Calendar, plus the Western City Run organiser page). When Supabase is connected, it comes from the database instead. Same shape either way.

## Run it on Windows

1. Install **Node.js 22 LTS or newer** from <https://nodejs.org> and **Git** from <https://git-scm.com>.
2. Open this folder in VS Code, then open a terminal (**Terminal → New Terminal**).
3. Install packages (first time only):
   ```bash
   npm install
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```
5. Open <http://localhost:3000>. To see it like a phone, press **F12** in Chrome/Edge and click the phone icon (Toggle device toolbar).

To try it on your actual phone, connect both to the same Wi-Fi and open `http://<your-PC's-IP>:3000` (find the IP with `ipconfig`).

### Put it under version control

```bash
git init
git add .
git commit -m "Stage 1: foundation, events and race pages"
```

Then create an empty repository on GitHub and follow its instructions to push.

## Admin portal

1. Add these to `.env.local` (copy `.env.example` if you haven't), then restart `npm run dev`:
   ```
   ADMIN_PASSWORD=pick-a-long-password
   SESSION_SECRET=any-random-text-at-least-32-characters-long
   ```
   On Windows, a quick way to make a secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
2. Open <http://localhost:3000/admin> and sign in. Sessions last 12 hours.
3. Submissions from the app and `/list` appear under **Review queue**, oldest first. Open one, tick the checklist as you compare it with the organiser's official page, then:
   - **Approve and publish** — choose the web address and badge ("Checked with official page" only if you really checked). The race appears on the website and app straight away.
   - **Ask for changes** — write what to fix. The organiser sees your note with their reference, edits the form and sends it back into the queue.
   - **Decline** — write the reason. The organiser sees it.
4. **Live listings** — change a badge, or **Hide** a race that's cancelled (and **Show again** later).

Where it's saved: until Supabase is connected, submissions and admin changes go to `data/local/` on your computer (ignored by git; delete the folder to start fresh). With Supabase connected (including `SUPABASE_SERVICE_ROLE_KEY`), they go to the `submissions` and `events` tables. Hosting with a read-only disk (e.g. Vercel) needs Supabase.

There are no emails yet: contact organisers from the review page (email, call or WhatsApp links), and they check progress with their reference.

## Accounts and email codes

### On the website (works on GitHub Pages)

The website's **Account** page (`/account`, the person icon in the header) uses Supabase Auth, so it works on the static GitHub Pages site too: the visitor's browser talks to Supabase directly, and Supabase emails the code. Name and phone are kept on the Supabase user (no tables needed). Until it's set up, the page says accounts are coming soon.

One-time setup (about 15 minutes):

1. Create a free project at <https://supabase.com> (region: EU West is closest to Ghana).
2. **Send codes, not links.** Supabase → **Authentication → Emails → Templates**. In both **Confirm signup** and **Magic link**, replace the body with something like:

   ```html
   <h2>Your Stride GH code</h2>
   <p>Enter this code to continue: <strong style="font-size:24px;letter-spacing:4px">{{ .Token }}</strong></p>
   <p>It works for 1 hour. If you didn't ask for it, ignore this email.</p>
   ```
   Subjects: "Your Stride GH code".
3. **Send from your Gmail.** Supabase's built-in email only reaches your own team's addresses, so real visitors need your own sender. **Authentication → Emails → SMTP Settings → Enable custom SMTP**: host `smtp.gmail.com`, port `465`, username = your Gmail address, password = your Gmail **App Password** (the same one in `.env.local`), sender = your Gmail address, sender name `Stride GH`. You type the password into Supabase's dashboard; it never goes in the repo.
4. **Authentication → URL Configuration → Site URL:** `https://<your-username>.github.io/<repo-name>/`.
5. **Project Settings → API:** copy the **Project URL** and the **anon public** key.
   - On your computer: put them in `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then restart `npm run dev`.
   - For GitHub Pages: **Settings → Secrets and variables → Actions → Variables**, add `SUPABASE_URL` and `SUPABASE_ANON_KEY`, then re-run the deploy. (The anon key is designed to be public; the service role key is not and never goes here.)

Adding these keys does **not** move your races and shops into Supabase: they keep coming from `data/*.seed.json` unless you also set `DATA_SOURCE=supabase` (see "Connect Supabase" below).

### Runner features (needs the step above)

Once accounts are on, the website also has:

- **I'm running this** on every upcoming race: it goes into the runner's races, with reminder emails.
- **Remind me** on every upcoming race, for anyone (no account needed): an email 3 days before registration closes (if the race has a `registration.closes` date), a week before, the day before with a checklist, and after the race with results.
- **New-race alerts** (Races page and Account): pick distances and towns, get an email when a matching race is listed.
- **After the race:** results and photos (from `recap` in `data/events.seed.json`), "Did you run it?" to log a finish time, and runners' reviews.
- **Race history and best times** on the Account page, and **Year in running** (`/year`): a card runners can download or share.
- **The app waiting list** on the home page.

To switch them on:

1. In Supabase → **SQL Editor**, paste and run `supabase/migrations/20261123000000_runner_features.sql`. It's safe to run again.
2. To send the emails, add the daily email job: put `notifications.yml` in `.github/workflows/` next to `deploy-pages.yml`, then in GitHub → **Settings → Secrets and variables → Actions**:
   - **Secrets:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (Supabase → Project Settings → API; this one is private, so only ever a secret), `GMAIL_USER`, `GMAIL_APP_PASSWORD`.
   - **Variable:** `SITE_URL` = `https://daniel-apexdev.github.io/StrideGH`.
3. Try it: **Actions → Send race reminders and alerts → Run workflow**, tick **Dry run**. The log lists who would get what, and nothing is sent. It then runs by itself every morning at about 6:40.

On your computer, `npm run notify -- --dry` does the same, reading `.env.local` (add `SUPABASE_SERVICE_ROLE_KEY` and `SITE_URL` there).

Gmail sends up to about 500 emails a day. Past that, switch the job to a sending service; it's one function in `scripts/send-notifications.mjs`.

Waiting-list emails are in Supabase → **Table Editor → app_waitlist**. Export them as CSV when the app launches.

### In the phone app

The app's *Create account* and *Sign in* screens talk to the website's API (`/api/auth/start`, `/api/auth/verify`, `/api/auth/me`, `/api/auth/signout`). `SESSION_SECRET` in `.env.local` is required.

How it behaves: codes are 6 digits, last 10 minutes, and work once. After 5 wrong tries the code is locked and a new one is needed. A new code can be requested after 30 seconds, up to 5 an hour per email. Only a hash of each code and each session is stored. A phone stays signed in for 90 days, until *Sign out of this phone*.

Accounts are saved in `data/local/accounts.json` until Supabase is connected, then in the `app_users`, `auth_codes` and `auth_sessions` tables (`supabase/migrations/20261120000000_create_accounts.sql`).

## Email

All email lives in `src/services/email/` (transport, shared layout, one file per template — see its README). What gets sent:

| Email | When |
| --- | --- |
| Sign-in code | Creating an account or signing in on a new phone |
| Race received / Changes received | An organiser submits a race, or resubmits after changes were requested |
| Your race is live / A few changes needed / We couldn't list this race | You approve, ask for changes or decline in the admin portal (your note is included) |

**Gmail** (what's set up now): in `.env.local`

```
GMAIL_USER=yourname@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

The password must be a Google **App Password** (Google Account → Security → 2-Step Verification → App passwords), not your normal one. Then run `npm run email:test -- you@example.com` to check the login and send a test message. Gmail allows about 500 emails a day; for a busy live site switch to Resend (`RESEND_API_KEY`, `EMAIL_FROM`) — no code changes needed.

Optional: `SITE_URL` (the address links in emails use — set it to your live domain when you deploy; default `http://localhost:3000`), `EMAIL_FROM_NAME`, `EMAIL_REPLY_TO`.

With no email settings, `npm run dev` prints emails in the terminal, and the app shows sign-in codes in a "Test mode" note. Organiser emails go out after the page responds, so a slow mail server never holds anyone up; if one fails, the submission's history in the admin portal says so.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm test` | Unit tests (dates, prices, filters, seed data, submissions, admin sign-in, accounts, phone and email checks) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm run build` | Production build — run before deploying |
| `npm run build:pages` | Static copy of the public site in `out/`, for GitHub Pages (see below) |
| `npm run race:next -- final-lap-2026 2027-12-18` | Copy a race to next year's date (see [data/RACES.md](data/RACES.md)) |
| `npm run db:seed-sql` | Regenerate `supabase/seed.sql` from `data/events.seed.json` |
| `npm run mobile` | Start the Expo app (same as `npx expo start` in `mobile/`) |
| `npm run email:test -- you@example.com` | Check the Gmail settings and send a test email |

## Publish on GitHub Pages

The repo includes `.github/workflows/deploy-pages.yml`, which builds the public website and publishes it on GitHub Pages every time you push to `main`, and again every morning so countdowns and "past race" labels stay current.

**One-time setup**

1. Push the project to GitHub (`.env.local` and `data/local/` are in `.gitignore`, so your passwords and admin data stay on your computer).
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Optional: **Settings → Secrets and variables → Actions → Variables → New repository variable** named `CONTACT_EMAIL` (the address organisers send new races to). Without it, organisers are asked to copy the details and email them. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` here too to turn on website accounts (see "Accounts and email codes").
4. Push, or open the **Actions** tab and run "Deploy website to GitHub Pages". The site appears at `https://<your-username>.github.io/<repo-name>/`.

**Updating races and shops:** edit, commit and push. The site rebuilds in about two minutes. See [data/RACES.md](data/RACES.md) for adding races, next year's editions, and what happens after race day (all automatic).

| To change | Edit |
| --- | --- |
| Races (details, dates, distances, fees) | `data/events.seed.json` |
| Race posters and photo galleries | add the image to `public/posters/`, then point the race's `poster` / `gallery` at it ([public/posters/README.md](public/posters/README.md)) |
| Shops and products | `data/stores.seed.json` ([data/STORES.md](data/STORES.md)) |
| Shop logos, covers and product photos | `public/stores/<shop-slug>/` ([public/stores/README.md](public/stores/README.md)) |

Run `npm test` before pushing: it checks the JSON files, so a typo shows up with the field name instead of a failed deploy (the workflow runs the same tests and stops if they fail).

**What's different on GitHub Pages.** Pages can only serve files, so there's no server:

- The admin portal, the `/api` routes and the app's sign-in codes aren't included. Website accounts still work, through Supabase.
- "List your race" still checks every field, then opens the organiser's email app with the details filled in (to `CONTACT_EMAIL`). You add the race to `data/events.seed.json` and push.
- "Check a submission" tells organisers to reply to your email instead.
- Races approved in the admin portal on your computer live in `data/local/` and are **not** published. Copy them into `data/events.seed.json` to put them on the site.
- Search and filters run in the visitor's browser, and "upcoming" uses the visitor's date, so the lists stay right between builds.
- The race and shop lists are also published as `/api/events` and `/api/stores`, so the phone app can use the Pages site for its data (see [mobile/README.md](mobile/README.md)).

To try the static site on your computer: `npm run build:pages`, then `npx serve out` and open the address it prints. (The build works on a copy in `.pages-build/` and never includes `.env` files.)

If you later want the admin portal and listing form online too, deploy the full app to a Node host such as Vercel instead; GitHub Pages can keep serving the static copy or be switched off.

## Connect Supabase (Stage 2)

You can skip this and keep working on seed data. When you're ready:

1. Create a free project at <https://supabase.com>. Pick the region closest to Ghana (e.g. EU West).
2. In **SQL Editor**, run each file in `supabase/migrations/` in order (`…create_events.sql`, `…add_poster_details.sql`, `…create_submissions.sql`, `…create_accounts.sql`), then `supabase/seed.sql`.
3. Copy `.env.example` to `.env.local` and fill in the **Project URL**, **anon public key** and **service_role key** from **Project Settings → API**. The service role key is what lets the admin portal save submissions and publish races.
4. Add `DATA_SOURCE=supabase` to `.env.local` and restart `npm run dev`. Pages now read races and shops from the database (without it they keep using `data/*.seed.json`, even with the keys set). Unpublished events (status `pending`) stay hidden thanks to row-level security.

Never put the `service_role` key in a `NEXT_PUBLIC_` variable or commit `.env.local`.

## Project layout

```
data/events.seed.json      Race data used until Supabase is connected (and to seed it)
scripts/generate-seed.mjs  Builds supabase/seed.sql from the JSON
supabase/migrations/       Database schema + row-level security
src/app/                   Pages (App Router): /, /events, /events/[slug], /saved, /shop, /account, /list, /list/status
src/app/admin/             Admin portal: sign-in, review queue, review page, live listings, Server Actions
src/app/api/events/        JSON API used by the mobile app: /api/events, /api/events/[slug]
src/app/api/submissions/   POST a race for review; GET status / PUT changes by reference + email
src/lib/submissions/       Submission form rules (zod), storage (local files or Supabase), submission → listing
src/lib/admin/auth.ts      Admin password check and signed session cookie
src/app/api/auth/          Account API for the app: email a code, verify it, who's signed in, sign out
src/lib/accounts/          Accounts, codes and sessions (local files or Supabase)
src/services/email/        Sending email (Gmail, Resend, or the terminal) and every email template
src/lib/contact.ts         Country codes, phone and email checks (mirrored in mobile/src/lib/contact.ts)
src/lib/dates.ts           19/Dec/2026 date format (mirrored in mobile/src/lib/dates.ts)
src/lib/stores/            Shop and product types, data loading and helpers (mirrored in mobile/src/lib/stores.ts)
src/app/shop/              /shop, /shop/[store], /shop/[store]/[product]
data/stores.seed.json      Local shops and their products (how-to: data/STORES.md)
public/stores/             Shop logos, covers and product photos (how-to: README.md inside)
data/local/                Local submissions and admin changes (created on first use, not committed)
mobile/                    Expo app (iOS + Android) — see mobile/README.md
src/components/            UI: bottom nav, theme toggle, event cards, register bar, save button
src/lib/events/            Types (zod), formatting helpers, data repository
src/lib/saved.ts           On-device saved races
src/app/globals.css        Design tokens for light and dark mode
tests/                     Vitest unit tests
docs/ROADMAP.md            Build stages and how to test each one
```

## Race posters

Drop organiser posters into `public/posters/`, then add a `poster` entry (`src`, `width`, `height`, `alt`) to the race in `data/events.seed.json`. `public/posters/README.md` has the details. The website and the app then show the poster in full on the race page, and as thumbnails on race cards. Races without one keep the typographic cover.

## Listing rules (keep these as the product grows)

- Never show a listing as verified unless someone checked it against the organiser's own page. Record when.
- Unknown is a valid value: "Venue not listed yet", "Fee unconfirmed", "See organiser". Don't guess.
- Race registration and payment happen on the organiser's page. Stride GH doesn't take race-entry payments.
- Store prices in minor units (pesewas) to avoid rounding errors.
