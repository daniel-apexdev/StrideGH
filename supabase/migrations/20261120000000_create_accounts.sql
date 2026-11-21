-- Accounts with email codes (no passwords). The website's API (src/lib/accounts) is the only thing
-- that touches these tables, using the service role key, so RLS is on with no public policies.

create table public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  phone text,
  created_at timestamptz not null default now(),
  -- Set when the first emailed code is entered: the email is confirmed.
  verified_at timestamptz,
  last_sign_in_at timestamptz
);

-- One live code per email. Only an HMAC of the code is stored.
create table public.auth_codes (
  email text primary key,
  purpose text not null check (purpose in ('signup', 'signin')),
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at text[] not null default '{}'
);

-- Signed-in devices. Only a SHA-256 of the token is stored.
create table public.auth_sessions (
  token_hash text primary key,
  user_id uuid not null references public.app_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index auth_sessions_user_idx on public.auth_sessions (user_id);

alter table public.app_users enable row level security;
alter table public.auth_codes enable row level security;
alter table public.auth_sessions enable row level security;
