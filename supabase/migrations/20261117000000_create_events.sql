-- Stage 2: race listings.
-- Public visitors can only read published events. Writes happen through the admin tools (Stage 3)
-- using the service role key on the server, never from the browser.

create extension if not exists pgcrypto;

create type public.event_status as enum ('pending', 'published', 'rejected', 'archived');
create type public.event_verification as enum ('unverified', 'verified', 'details_tbc');
create type public.distance_category as enum ('5K', '10K', 'Half', 'Marathon', 'Other');
create type public.registration_method as enum ('url', 'phone', 'ussd', 'none');
create type public.fee_kind as enum ('free', 'paid', 'unconfirmed');

create table public.organisers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  website text,
  instagram text,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  event_date date not null,
  start_time time,
  region text,
  city text,
  venue text,
  organiser_id uuid references public.organisers (id) on delete set null,
  fee_summary text,
  fee_kind public.fee_kind not null default 'unconfirmed',
  currency char(3) not null default 'GHS',
  registration_method public.registration_method not null default 'none',
  registration_url text,
  registration_note text,
  highlights text[] not null default '{}',
  walker_friendly boolean,
  verification public.event_verification not null default 'unverified',
  verified_at timestamptz,
  source_name text,
  cover_color text not null default '#0e3b2c' check (cover_color ~ '^#[0-9a-fA-F]{6}$'),
  poster_path text,
  status public.event_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_published_date_idx on public.events (event_date) where status = 'published';

create table public.event_distances (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  label text not null,
  category public.distance_category not null,
  price_minor integer check (price_minor >= 0),
  note text,
  sort smallint not null default 0
);

create index event_distances_event_idx on public.event_distances (event_id);

-- Keep updated_at honest.
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_touch before update on public.events
  for each row execute function public.touch_updated_at();

-- Row level security: read-only public access to published listings.
alter table public.organisers enable row level security;
alter table public.events enable row level security;
alter table public.event_distances enable row level security;

create policy "Published events are public" on public.events
  for select using (status = 'published');

create policy "Distances of published events are public" on public.event_distances
  for select using (
    exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
  );

create policy "Organisers are public" on public.organisers
  for select using (true);
