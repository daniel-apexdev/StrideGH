# Stride GH — mobile app

The iOS and Android app for Stride GH, built with Expo (SDK 58) and Expo Router — set up the same way as the Savannah Cinemas app. It reads race data from the Next.js site one folder up (`../`), which serves it at `/api`. There's no separate backend.

Design: the same tokens as the website (deep forest, volt accent, paper; Barlow Condensed for headlines, Inter for reading), in light and dark mode.

## Run it

1. Start the website — it's also the API:

   ```sh
   cd ..          # the stride-gh folder
   npm run dev    # port 3000
   ```

2. In this folder:

   ```sh
   npm install
   npx expo start
   ```

3. Scan the QR code with **Expo Go** (Android) or the Camera app (iOS). Your phone and computer must be on the same Wi-Fi. The app finds the API automatically at `http://<your computer's IP>:3000/api`. On Windows, allow Node through the firewall the first time (Private networks).

Other targets: `npm run web` (browser), `npm run android` (emulator).

To point at a different server (e.g. the deployed site), copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.

### Using the GitHub Pages website

The Pages site publishes the race and shop lists as files the app can read, so new races you
push show up in the app too. In `mobile/.env`:

```sh
EXPO_PUBLIC_API_URL=https://daniel-apexdev.github.io/StrideGH/api
EXPO_PUBLIC_SITE_URL=https://daniel-apexdev.github.io/StrideGH
# Where "List your race" sends the details (Pages has no server to receive them):
EXPO_PUBLIC_CONTACT_EMAIL=you@example.com
# Accounts (the same Supabase project as the website, so one account works in both):
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Restart `npx expo start` after changing `.env`. With the Pages site:

- Races, shops, posters and share links come from the website, and update when you push.
- **List your race** checks every field, then opens the organiser's email app with the details filled in.
- **Your submissions** (tracking a reference) needs the full website with its server, so it won't find references.
- Accounts work through Supabase when the two `SUPABASE` lines are set. Without them, the app uses the website's own `/api/auth`, which needs the full website running.

## Where the race data comes from

The races live in one file: `../data/events.seed.json`. Later they'll live in Supabase. The app gets them two ways:

1. **Live** — from the website's API, `http://<your computer's IP>:3000/api/events`. This is the normal path, and it's how database changes will reach the app later.
2. **Built-in copy** — the same JSON file is bundled into the app (see `metro.config.js`). If the API can't be reached, the app shows this copy with a yellow "Showing the race list built into the app" notice, so you're never looking at an empty screen.

**Account → Development** shows which one you're getting, plus the reason if live data failed.

### If you see the yellow notice

- **Is the website running?** In the `stride-gh` folder, run `npm run dev`. On your computer, open `http://localhost:3000/api/events` in a browser: you should see JSON.
- **Can the phone reach it?** Open `http://<your computer's IP>:3000/api/events` in the phone's browser. The IP is the "Network" address `npm run dev` prints, the same one in the yellow notice.
  - If the phone can't open it, Windows Firewall is blocking it. Allow Node.js on **Private** networks, and set your Wi-Fi to **Private** in Settings → Network & internet.
- **Using `expo start --tunnel`?** A tunnel only forwards Expo, not the website. Use the normal LAN mode, or set `EXPO_PUBLIC_API_URL` in `mobile/.env` to an address the phone can reach.
- After fixing, pull down on Home or tap **Try live data again**.

## Opening the app

1. **Native splash:** plain forest green.
2. **Intro** (`src/components/intro.tsx`, about 1.5 s, every launch): the "S" mark pops in, then STRIDE GH and the tagline rise in underneath. Tap to skip. With "Reduce motion" on, it's a short still card.
3. **Welcome slides** (`src/app/welcome.tsx`, first launch only): what you can do, ending in **Create account** / **Sign in**, or **Look around first**. Account → "Show the welcome screens again" brings them back.
4. **Sign in / Create account** (`src/app/sign-in.tsx`): the form and its validation are finished, but accounts aren't connected yet (`ACCOUNTS_LIVE = false` in `src/lib/auth.ts`). Submitting explains that accounts aren't switched on, and nothing is sent or stored. They connect to Supabase Auth in Stage 5.

The logo is drawn in `src/components/logo.tsx` (the "S" mark and the wordmark). The app icons in `assets/images/` were generated from the same drawing.

## What's in it

Bottom bar: **Home · Events · Shop · Saved · Account**.

| Screen | Route | API |
| --- | --- | --- |
| Home: next race with open registration, coming up, search, theme toggle | `src/app/(tabs)/index.tsx` | `GET /api/events` |
| Events: search, distance chips, more filters (when, where, entry fee) | `src/app/(tabs)/events.tsx` | `GET /api/events` |
| Race: poster slot, facts, verification status, organiser, venue + map, distances and fees, add to calendar, share, other races that month, official registration | `src/app/event/[slug].tsx` | `GET /api/events` |
| Saved: races saved on this phone, with countdowns | `src/app/(tabs)/saved.tsx` | `GET /api/events` |
| Shop: placeholder until Stage 4 | `src/app/(tabs)/shop.tsx` | — |
| Account: appearance (System / Light / Dark), signed-in details and sign out (or create account / sign in), list your race, your submissions, show welcome again | `src/app/(tabs)/account.tsx` | `GET /api/auth/me` |
| Create account / sign in: name, email, phone with country code → 6-digit emailed code | `src/app/sign-in.tsx` | `POST /api/auth/start`, `POST /api/auth/verify` |
| List your race: how it works, what you need, listing guidelines | `src/app/list/index.tsx` | — |
| Listing form: 7 steps (race, when & where, distances & fees, what's included, registration, about you, check & send), date and time wheels, country-code phone, saved on the phone as you go, about-you filled from the signed-in account | `src/app/list/form.tsx` | `POST /api/submissions`, `PUT /api/submissions/[ref]` |
| Your submissions: status of races sent from this phone, lookup by reference + email, edit and resubmit | `src/app/list/submissions.tsx` | `GET /api/submissions/[ref]?email=` |

Every data screen has loading, empty, error/offline and retry states, and pull to refresh. The race list is fetched once and shared between screens for a minute. Official registration always opens the organiser's own page in an in-app browser, after a sheet explaining that Stride GH doesn't take payment.

Code layout: `src/theme.ts` (tokens), `src/lib` (API client and config, race helpers, saved races, appearance, storage), `src/components` (type, controls, icons, race cards, states).

`src/lib/races.ts` mirrors the website's `src/lib/events/types.ts` and `format.ts`, and `src/lib/submission.ts` mirrors `src/lib/submissions/schema.ts` and `form.ts`. If you change the API's shape on the website, change it here too. Submissions are reviewed in the website's admin portal (`/admin`), not in the app.

## Builds

`eas.json` has `preview` (an installable test build) and `production` profiles. On Windows you can build Android locally or both platforms in the cloud with EAS: `npx eas build --profile preview --platform android`.
