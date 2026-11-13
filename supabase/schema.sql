-- Salon of Sid: run this whole file once in Supabase > SQL Editor > New query > Run.

-- 1. Tables ---------------------------------------------------------------
create table if not exists public.lists (
  id         text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text,
  language   text,
  sort_order integer not null default 0,
  checked    text,
  films      jsonb not null default '[]'::jsonb
);

create table if not exists public.added_films (
  id      text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data    jsonb not null default '{}'::jsonb
);

create table if not exists public.notes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  film_id text not null,
  status  text not null default 'want' check (status in ('want','watching','watched')),
  insight text not null default '',
  remarks text not null default '',
  stars   integer not null default 0 check (stars between 0 and 5),
  updated bigint not null default 0,
  primary key (user_id, film_id)
);

-- 2. Row-level security: only the signed-in owner of a row can touch it ----
alter table public.lists       enable row level security;
alter table public.added_films enable row level security;
alter table public.notes       enable row level security;

drop policy if exists "owner all" on public.lists;
drop policy if exists "owner all" on public.added_films;
drop policy if exists "owner all" on public.notes;

create policy "owner all" on public.lists       for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner all" on public.added_films for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner all" on public.notes       for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Nothing is readable without signing in.
revoke all on public.lists, public.added_films, public.notes from anon;

-- 3. Realtime for notes (and films you add) ---------------------------------
do $$ begin
  begin alter publication supabase_realtime add table public.notes;       exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.added_films; exception when duplicate_object then null; end;
end $$;
