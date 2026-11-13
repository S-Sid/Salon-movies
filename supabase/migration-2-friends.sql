-- Friends version. Run ONCE in Supabase > SQL Editor > New query > Run.
-- Safe to run again. Run it BEFORE the new site version goes live.

-- 1. Settings (invite code). Nobody can read this table through the website. ----
create table if not exists public.app_settings (key text primary key, value text);
alter table public.app_settings enable row level security;          -- no policies = closed to the API
revoke all on public.app_settings from anon, authenticated;
-- Starts as a random value nobody can guess = sign-ups effectively closed until YOU set a code:
insert into public.app_settings (key, value) values ('invite_code', gen_random_uuid()::text)
  on conflict (key) do nothing;

-- 2. Usernames. Unique ignoring capitals; only usernames are ever shown, never emails. ---
create table if not exists public.profiles (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  username   text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);
create unique index if not exists profiles_username_ci on public.profiles (lower(username));
alter table public.profiles enable row level security;
revoke all on public.profiles from anon;
drop policy if exists "read all"   on public.profiles;
drop policy if exists "insert own" on public.profiles;
drop policy if exists "update own" on public.profiles;
create policy "read all"   on public.profiles for select to authenticated using (true);
create policy "insert own" on public.profiles for insert to authenticated with check (user_id = auth.uid());
create policy "update own" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 3. Admins (you). Nobody can edit this table from the website. -------------------------
create table if not exists public.admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;
drop policy if exists "see self" on public.admins;
create policy "see self" on public.admins for select to authenticated using (user_id = auth.uid());
-- The first account ever created (yours) becomes the admin:
insert into public.admins (user_id) select id from auth.users order by created_at limit 1
  on conflict do nothing;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- 4. Invite code check when a NEW account is created. -----------------------------------
create or replace function public.check_invite() returns trigger
  language plpgsql security definer set search_path = public as $$
declare need text;
begin
  select value into need from public.app_settings where key = 'invite_code';
  if need is not null and need <> ''
     and lower(coalesce(new.raw_user_meta_data->>'invite_code', '')) <> lower(need) then
    raise exception 'invalid invite code';
  end if;
  return new;
end $$;
drop trigger if exists check_invite on auth.users;
create trigger check_invite before insert on auth.users for each row execute function public.check_invite();

-- 5. The film catalogue is now shared. ---------------------------------------------------
-- lists (your 201 films): everyone signed in can read; only admins can change.
drop policy if exists "owner all" on public.lists;
drop policy if exists "friends read" on public.lists;
drop policy if exists "admin write"  on public.lists;
create policy "friends read" on public.lists for select to authenticated using (true);
create policy "admin write"  on public.lists for all    to authenticated using (public.is_admin()) with check (public.is_admin());

-- added_films: everyone reads; anyone adds (as themselves); admin edits; adder or admin deletes.
drop policy if exists "owner all"       on public.added_films;
drop policy if exists "friends read"    on public.added_films;
drop policy if exists "friends add"     on public.added_films;
drop policy if exists "admin edit"      on public.added_films;
drop policy if exists "adder or admin delete" on public.added_films;
create policy "friends read" on public.added_films for select to authenticated using (true);
create policy "friends add"  on public.added_films for insert to authenticated with check (auth.uid() = user_id);
create policy "admin edit"   on public.added_films for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "adder or admin delete" on public.added_films for delete to authenticated using (auth.uid() = user_id or public.is_admin());

-- 6. Personal notes stay private. Two new fields. --------------------------------------------
alter table public.notes
  add column if not exists best_time text not null default '',
  add column if not exists feeling   text not null default '';

-- 7. What friends are allowed to see: username + stars + remarks + best time + feeling. -------
-- (Your private "insight" text and your email are never included.)
drop view if exists public.public_takes;
create view public.public_takes with (security_invoker = false) as
  select n.film_id, p.username, n.stars, n.remarks, n.best_time, n.feeling, n.status, n.updated
  from public.notes n join public.profiles p on p.user_id = n.user_id
  where n.stars > 0 or n.remarks <> '' or n.best_time <> '' or n.feeling <> '';

drop view if exists public.film_stats;
create view public.film_stats with (security_invoker = false) as
  select film_id,
         count(*) filter (where status = 'watched') as seen_count,
         count(*) filter (where stars > 0)          as rated_count,
         round(avg(nullif(stars, 0))::numeric, 1)   as avg_stars
  from public.notes group by film_id;

revoke all on public.public_takes, public.film_stats from anon;
grant select on public.public_takes, public.film_stats to authenticated;

-- 8. To set or change the invite code later, run (with your own word):
--    update public.app_settings set value = 'your-code-word' where key = 'invite_code';
--    To leave sign-up fully open instead:  update public.app_settings set value = '' where key = 'invite_code';
