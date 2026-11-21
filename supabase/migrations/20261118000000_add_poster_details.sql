-- Race posters: keep the image's real size so it can be shown uncropped, plus alt text.
-- poster_path is either a path on the website ("/posters/...") or a full Supabase Storage URL.
alter table public.events
  add column if not exists poster_width integer check (poster_width > 0),
  add column if not exists poster_height integer check (poster_height > 0),
  add column if not exists poster_alt text;
