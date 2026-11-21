# Build roadmap

Each stage ends with something you can use and test. Don't start the next stage until the "done when" list passes.
The clickable design prototype is the reference for every screen.

## Stage 1 — Foundation, events and race pages ✅

**Built:** Next.js 16 + TypeScript + Tailwind 4, design tokens (light/dark), bottom navigation, Home, Events with filters, race pages, Saved (on device), placeholders for Shop/Account/List. Seed data from the community race calendar. Unit tests.

**Also built:** the Expo app in `mobile/` (Home, Events, Race, Saved, Account; light/dark) reading from `/api/events`. Every later stage adds its screens to both the website and the app.

**Done when:**
- [x] `npm run build`, `npm test`, `npm run lint` all pass
- [ ] The app opens in Expo Go on your phone and shows the races
- [ ] Intro, welcome slides and sign-in screen feel right on a real phone
- [ ] First organiser posters added to `public/posters/`
- [ ] You've opened it on your phone, in light and dark mode
- [ ] Every upcoming race in the calendar shows, and past races move to "Past races"

## Stage 2 — Events from the database, first deploy

**Build:** Create the Supabase project, run the migration and seed (see README). Deploy to Vercel (free tier for testing; the Pro plan is needed once it's a commercial site) and connect a domain.

**Why now:** real runners can see it and you start learning which races they look at.

**Test:**
- Add a row in Supabase with `status = 'pending'` → it must *not* appear on the site.
- Change it to `published` → it appears within an hour (or immediately once Stage 3 adds on-demand refresh).
- Share a race page link on WhatsApp and check the preview title.

## Stage 3 — Admin and submissions ✅ (first version)

**Built:**
- `/list` on the website and *List your race* in the app (7 steps, saved on the device as you go). Submissions land as `pending` with a reference (`SGH-XXXXXX`); organisers check status with reference + email, and edit and resubmit when changes are requested.
- `POST /api/submissions`, `GET`/`PUT /api/submissions/[reference]` (zod validation, honeypot, per-IP rate limit).
- `/admin`: password sign-in (signed http-only cookie), review queue by status, review page with checklist, internal notes, preview card, approve and publish (choose web address and badge, records `verified_at`), ask for changes, decline. Live listings: change badge, hide / show again. Changes call `updateTag("events")` so they show at once.
- Storage: `data/local/*.json` without Supabase; `submissions` table + `events` with the service role key (`supabase/migrations/20261119000000_create_submissions.sql`).

**Test:** a submission never appears until approved; `/admin` without signing in redirects to sign-in; the anon key can't read `submissions` (RLS, no policies); declined and changes-requested notes show on the organiser's status.

**Still to do:**
- Supabase Auth with an `admin` role (replace the shared password when more people review).
- Poster upload to Supabase Storage from the form (today organisers share a link; add the poster by hand as in `public/posters/README.md`).
- Edit a live listing's details in the admin (today: badge and hide/show; fix data in the seed or database).
- Email organisers when their status changes (Resend is now set up for account codes), and a "Report this listing" form.

## Stage 4 — Shop catalogue and test-mode checkout

**Build:** `vendors`, `products`, `product_variants`, product images; shop and product pages from the prototype; vendor registration with approval; cart; **simulated checkout** (Mobile Money / card choice → simulated approve/decline) writing to `orders` and `order_items` with a clear status model:

`pending_payment → paid → confirmed_by_shop → ready / out_for_delivery → completed` (plus `payment_failed`, `cancelled`, `refunded`).

Keep the payment step behind one interface (`PaymentProvider`) so the simulated provider can later be swapped for a real one without touching the screens.

**Test:** totals and delivery fees across two shops; declined payment leaves the cart intact; stock that isn't confirmed is never shown as "In stock".

## Accounts (started early)

**Built:** passwordless accounts in the app — create account (name, email, phone with country code) and sign in with a 6-digit emailed code; signed-in details and sign out on the Account tab; the listing form fills "About you" from the account. API: `/api/auth/start|verify|me|signout`. Emails via Resend (`RESEND_API_KEY`, `EMAIL_FROM`).

**Still to do:** sign in on the website; sync saved races to the account; edit name/phone; delete account.

## Stage 5 — Accounts, saved sync and notifications

**Build:** sync on-device saved races into a `saved_items` table on sign-in; order history; email reminders before registration closes.

## Stage 6 — Live payments (only when shops and volume justify it)

**Build:** a Ghana-ready provider with Mobile Money (e.g. Paystack). Server-side verification of every payment, signed webhook handling with idempotency, never trust the browser's "success". Never store card details. Vendor payouts stay manual at first.

**Test:** provider test mode end to end, webhook replay, duplicate webhook, timeout, refund.

## Later

Clubs and group runs, organiser analytics, results, native apps.
