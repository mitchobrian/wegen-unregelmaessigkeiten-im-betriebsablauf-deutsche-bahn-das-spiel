-- =====================================================================
-- Bestenliste – Supabase/Postgres-Schema
-- Einmalig im Supabase-Projekt unter SQL Editor ausführen.
-- =====================================================================

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  name        text        not null,
  score       integer     not null,
  level       integer     not null default 1,
  created_at  timestamptz not null default now(),

  -- einfache Plausibilitäts-/Missbrauchsgrenzen (serverseitige Härtung)
  constraint scores_name_len   check (char_length(name) between 2 and 24),
  constraint scores_score_rng  check (score >= 0 and score <= 1000000),
  constraint scores_level_rng  check (level between 1 and 3)
);

-- Sortier-Performance für die Top-Abfrage
create index if not exists scores_score_idx on public.scores (score desc);

-- =====================================================================
-- Row Level Security:
-- Der anon-Key ist öffentlich (steckt im Frontend) und wird ausschließlich
-- über diese Policies eingegrenzt. Erlaubt: öffentliches Lesen + Eintragen.
-- NICHT erlaubt: Ändern/Löschen vorhandener Einträge.
-- =====================================================================
alter table public.scores enable row level security;

drop policy if exists "scores_public_read" on public.scores;
create policy "scores_public_read"
  on public.scores for select
  to anon
  using (true);

drop policy if exists "scores_public_insert" on public.scores;
create policy "scores_public_insert"
  on public.scores for insert
  to anon
  with check (
    char_length(name) between 2 and 24
    and score >= 0 and score <= 1000000
    and level between 1 and 3
  );

-- Hinweis: Update/Delete bleiben für anon bewusst gesperrt (keine Policy = verboten).
