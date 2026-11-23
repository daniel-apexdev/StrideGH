-- Runner features for website accounts (Supabase Auth): races people are running, race
-- reminders, new-race alerts, race history and reviews, plus the app waiting list.
--
-- Works on its own: you can run just this file in Supabase → SQL Editor, even if you haven't
-- moved race data into Supabase. Race details still come from data/events.seed.json, so rows
-- here refer to races by their slug and keep a copy of the few details they need.
--
-- Who can do what (Row Level Security):
--   * Signed-in runners read and change only their own rows.
--   * Anyone (signed in or not) can sign up for reminders, alerts and the app list, but can't
--     read anyone's email back. Unsubscribing uses the private link in each email.
--   * Reviews are public to read.
--   * The daily email job (scripts/send-notifications.mjs) uses the service role key, which
--     bypasses these rules. Keep that key secret: GitHub Actions secret only, never NEXT_PUBLIC_.

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- 1 + 3. Races a runner says they're running, and their result afterwards.
create table if not exists public.race_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  race_slug text not null check (race_slug ~ '^[a-z0-9-]+$'),
  race_name text not null check (char_length(race_name) <= 120),
  race_date date not null,
  region text check (char_length(region) <= 60),
  distance_label text check (char_length(distance_label) <= 40),
  distance_category text check (distance_category in ('5K', '10K', 'Half', 'Marathon', 'Other')),
  distance_km numeric(5, 2) check (distance_km > 0 and distance_km <= 400),
  -- Finish time in seconds, filled in after the race.
  finish_seconds integer check (finish_seconds > 0 and finish_seconds < 172800),
  note text check (char_length(note) <= 280),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, race_slug)
);
create index if not exists race_entries_user_idx on public.race_entries (user_id, race_date desc);
drop trigger if exists race_entries_touch on public.race_entries;
create trigger race_entries_touch before update on public.race_entries
  for each row execute function public.touch_updated_at();

alter table public.race_entries enable row level security;
drop policy if exists "Runners see their own entries" on public.race_entries;
create policy "Runners see their own entries" on public.race_entries
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Runners add their own entries" on public.race_entries;
create policy "Runners add their own entries" on public.race_entries
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Runners change their own entries" on public.race_entries;
create policy "Runners change their own entries" on public.race_entries
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Runners remove their own entries" on public.race_entries;
create policy "Runners remove their own entries" on public.race_entries
  for delete to authenticated using (user_id = auth.uid());

-- 1. Email reminders for one race (registration closing, a week before, the day before, results).
create table if not exists public.race_reminders (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  race_slug text not null check (race_slug ~ '^[a-z0-9-]+$'),
  -- Set when a signed-in runner asks; null for visitors without an account.
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  -- Private link for "stop these emails".
  token uuid not null unique default gen_random_uuid(),
  -- Which reminders have gone out: 'closing', 'week', 'eve', 'after'.
  sent text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (email, race_slug)
);

alter table public.race_reminders enable row level security;
drop policy if exists "Anyone can ask for race reminders" on public.race_reminders;
create policy "Anyone can ask for race reminders" on public.race_reminders
  for insert to anon, authenticated
  with check ((user_id is null or user_id = auth.uid()) and sent = '{}');
drop policy if exists "Runners see their own reminders" on public.race_reminders;
create policy "Runners see their own reminders" on public.race_reminders
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Runners stop their own reminders" on public.race_reminders;
create policy "Runners stop their own reminders" on public.race_reminders
  for delete to authenticated using (user_id = auth.uid());

-- 2. Alerts when new races are listed. Empty lists mean "any".
create table if not exists public.race_alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade,
  distances text[] not null default '{}',
  cities text[] not null default '{}',
  token uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists race_alerts_touch on public.race_alerts;
create trigger race_alerts_touch before update on public.race_alerts
  for each row execute function public.touch_updated_at();

alter table public.race_alerts enable row level security;
drop policy if exists "Anyone can sign up for new-race alerts" on public.race_alerts;
create policy "Anyone can sign up for new-race alerts" on public.race_alerts
  for insert to anon, authenticated with check (user_id is null or user_id = auth.uid());
drop policy if exists "Runners see their own alerts" on public.race_alerts;
create policy "Runners see their own alerts" on public.race_alerts
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "Runners change their own alerts" on public.race_alerts;
create policy "Runners change their own alerts" on public.race_alerts
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Runners stop their own alerts" on public.race_alerts;
create policy "Runners stop their own alerts" on public.race_alerts
  for delete to authenticated using (user_id = auth.uid());

-- Which races each alert has already told someone about. Only the email job uses it.
create table if not exists public.race_alerts_sent (
  alert_id uuid not null references public.race_alerts (id) on delete cascade,
  race_slug text not null,
  sent_at timestamptz not null default now(),
  primary key (alert_id, race_slug)
);
alter table public.race_alerts_sent enable row level security;

-- Waiting list for the phone app.
create table if not exists public.app_waitlist (
  email text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 200),
  source text not null default 'website' check (char_length(source) <= 40),
  created_at timestamptz not null default now()
);
alter table public.app_waitlist enable row level security;
drop policy if exists "Anyone can join the app waiting list" on public.app_waitlist;
create policy "Anyone can join the app waiting list" on public.app_waitlist
  for insert to anon, authenticated with check (true);

-- 5. Runners' reviews of races they ran.
create table if not exists public.race_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  race_slug text not null check (race_slug ~ '^[a-z0-9-]+$'),
  reviewer_name text not null check (char_length(reviewer_name) between 1 and 60),
  overall smallint not null check (overall between 1 and 5),
  course smallint check (course between 1 and 5),
  organisation smallint check (organisation between 1 and 5),
  water smallint check (water between 1 and 5),
  medal smallint check (medal between 1 and 5),
  comment text check (char_length(comment) <= 600),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, race_slug)
);
create index if not exists race_reviews_race_idx on public.race_reviews (race_slug, created_at desc);
drop trigger if exists race_reviews_touch on public.race_reviews;
create trigger race_reviews_touch before update on public.race_reviews
  for each row execute function public.touch_updated_at();

alter table public.race_reviews enable row level security;
drop policy if exists "Reviews are public" on public.race_reviews;
create policy "Reviews are public" on public.race_reviews for select to anon, authenticated using (true);
drop policy if exists "Runners write their own review" on public.race_reviews;
create policy "Runners write their own review" on public.race_reviews
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Runners edit their own review" on public.race_reviews;
create policy "Runners edit their own review" on public.race_reviews
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Runners delete their own review" on public.race_reviews;
create policy "Runners delete their own review" on public.race_reviews
  for delete to authenticated using (user_id = auth.uid());

-- "Stop these emails" from the link in a reminder or alert. Works without signing in:
-- the token is the proof. Returns what was stopped.
create or replace function public.unsubscribe(p_token uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  delete from public.race_reminders where token = p_token;
  get diagnostics n = row_count;
  if n > 0 then return 'reminder'; end if;
  delete from public.race_alerts where token = p_token;
  get diagnostics n = row_count;
  if n > 0 then return 'alerts'; end if;
  return 'none';
end $$;
revoke all on function public.unsubscribe(uuid) from public;
grant execute on function public.unsubscribe(uuid) to anon, authenticated;

-- Signed-in runners: link reminders/alerts they set up before having an account (same email).
create or replace function public.claim_my_subscriptions() returns void
language plpgsql security definer set search_path = public as $$
declare
  my_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or my_email = '' then return; end if;
  update public.race_reminders set user_id = auth.uid() where user_id is null and lower(email) = my_email;
  update public.race_alerts set user_id = auth.uid() where user_id is null and lower(email) = my_email;
end $$;
revoke all on function public.claim_my_subscriptions() from public;
grant execute on function public.claim_my_subscriptions() to authenticated;
