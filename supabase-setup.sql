-- Lexicon: schema for the shared `words` bank.
-- Run this in the new project's SQL Editor (Supabase dashboard → SQL Editor → New query → Run).
-- Matches wordToRow()/rowToWord() in helpers.jsx. id/added_at/last_reviewed_at are
-- generated client-side (epoch ms), so id is text and the timestamps are bigint.

create table if not exists public.words (
  id               text primary key,
  word             text not null,
  tag              text        default '',
  definition       text        default '',
  example          text        default '',
  memory_hook      text        default '',
  hook_theme       text        default '',
  mastered         boolean     default false,
  review_level     integer     default 0,
  last_reviewed_at bigint,
  added_at         bigint      default 0
);

-- The app uses the public anon key client-side, so anon must be able to
-- read/insert/update/delete. (Same trust model as the original project.)
-- Table-level GRANT is required in addition to the RLS policy below; without
-- it PostgREST returns 401 "permission denied for table words".
grant select, insert, update, delete on public.words to anon, authenticated;

alter table public.words enable row level security;

create policy "anon full access" on public.words
  for all
  to anon
  using (true)
  with check (true);

-- Realtime: app.jsx subscribes to postgres_changes on public.words.
alter publication supabase_realtime add table public.words;
