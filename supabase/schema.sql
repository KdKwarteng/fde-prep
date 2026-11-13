-- Run this once in the Supabase SQL editor. It is safe to run again.

-- One row per user, holding their whole progress object as JSON.
create table if not exists public.progress (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security: the browser talks to the database directly with a
-- public key, so these policies are what keep each user to their own row.
alter table public.progress enable row level security;

drop policy if exists "Users read their own progress" on public.progress;
create policy "Users read their own progress"
  on public.progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users insert their own progress" on public.progress;
create policy "Users insert their own progress"
  on public.progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own progress" on public.progress;
create policy "Users update their own progress"
  on public.progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
