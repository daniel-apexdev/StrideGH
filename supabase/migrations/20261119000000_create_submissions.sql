-- Stage 3: organiser submissions and the admin review queue.
-- Organisers submit through POST /api/submissions (app and website). Only the server, using the
-- service role key, reads or writes this table, so RLS is on with no public policies.

alter table public.events add column if not exists description text;

create type public.submission_status as enum ('pending', 'changes_requested', 'approved', 'rejected');

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique check (reference ~ '^SGH-[A-Z0-9]{6}$'),
  status public.submission_status not null default 'pending',
  source text not null check (source in ('app', 'web')),
  contact_email text not null,
  -- The organiser's form exactly as submitted (validated by src/lib/submissions/schema.ts).
  data jsonb not null,
  -- Shown to the organiser when they check their status.
  reviewer_note text,
  -- Admin-only.
  internal_note text,
  checklist jsonb not null default '{}'::jsonb,
  published_slug text references public.events (slug) on update cascade on delete set null,
  -- Audit trail: [{ at, action, note }]
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index submissions_status_idx on public.submissions (status, created_at desc);
create index submissions_email_idx on public.submissions (lower(contact_email));

create trigger submissions_touch before update on public.submissions
  for each row execute function public.touch_updated_at();

alter table public.submissions enable row level security;
-- No policies: anon and signed-in users can't read or write submissions directly.
