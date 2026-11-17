-- Groups version. Run ONCE in Supabase > SQL Editor > New query > Run.
-- Safe to run again. Run it BEFORE the new site version goes live.
-- Needs migration-2-friends.sql to have been run first.

-- 1. Groups, members ------------------------------------------------------------------
create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  code       text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id  uuid not null references public.groups(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member' check (role in ('admin','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user on public.group_members (user_id);

alter table public.groups        enable row level security;
alter table public.group_members enable row level security;
revoke all on public.groups, public.group_members from anon;
-- The website never inserts into these directly: it uses the functions below.
revoke insert, update on public.groups, public.group_members from authenticated;

-- 2. Helper functions (security definer so policies don't loop on themselves) --------------
create or replace function public.is_member(gid uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid()) $$;

create or replace function public.is_group_admin(gid uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.group_members where group_id = gid and user_id = auth.uid() and role = 'admin') $$;

create or replace function public.shares_group(uid uuid) returns boolean
  language sql stable security definer set search_path = public as
  $$ select uid = auth.uid() or exists (
       select 1 from public.group_members a join public.group_members b on a.group_id = b.group_id
       where a.user_id = auth.uid() and b.user_id = uid) $$;

create or replace function public.gen_group_code() returns text
  language sql volatile as
  $$ select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 5)) $$;

-- 3. Functions the website calls ----------------------------------------------------------
create or replace function public.create_group(group_name text) returns public.groups
  language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.groups (name, code, created_by) values (btrim(group_name), public.gen_group_code(), auth.uid()) returning * into g;
  insert into public.group_members (group_id, user_id, role) values (g.id, auth.uid(), 'admin');
  return g;
end $$;

create or replace function public.join_group(join_code text) returns public.groups
  language plpgsql security definer set search_path = public as $$
declare g public.groups;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from public.groups where code = upper(btrim(join_code));
  if not found then raise exception 'unknown code'; end if;
  insert into public.group_members (group_id, user_id) values (g.id, auth.uid()) on conflict do nothing;
  return g;
end $$;

create or replace function public.regenerate_group_code(gid uuid) returns text
  language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not public.is_group_admin(gid) then raise exception 'admins only'; end if;
  c := public.gen_group_code();
  update public.groups set code = c where id = gid;
  return c;
end $$;

create or replace function public.rename_group(gid uuid, new_name text) returns void
  language plpgsql security definer set search_path = public as $$
begin
  if not public.is_group_admin(gid) then raise exception 'admins only'; end if;
  update public.groups set name = btrim(new_name) where id = gid;
end $$;

create or replace function public.username_available(name text) returns boolean
  language sql stable security definer set search_path = public as
  $$ select not exists (select 1 from public.profiles where lower(username) = lower(name)) $$;

revoke all on function public.create_group(text), public.join_group(text), public.regenerate_group_code(uuid),
  public.rename_group(uuid, text), public.username_available(text) from public, anon;
grant execute on function public.create_group(text), public.join_group(text), public.regenerate_group_code(uuid),
  public.rename_group(uuid, text), public.username_available(text) to authenticated;

-- 4. Policies for groups and members ---------------------------------------------------------
drop policy if exists "members read"   on public.groups;
drop policy if exists "admin delete"   on public.groups;
create policy "members read" on public.groups for select to authenticated using (public.is_member(id));
create policy "admin delete" on public.groups for delete to authenticated using (public.is_group_admin(id));

drop policy if exists "see co-members"     on public.group_members;
drop policy if exists "leave or remove"    on public.group_members;
create policy "see co-members" on public.group_members for select to authenticated using (public.is_member(group_id));
create policy "leave or remove" on public.group_members for delete to authenticated
  using (user_id = auth.uid() or public.is_group_admin(group_id));

-- 5. Films belong to a group ------------------------------------------------------------------
alter table public.lists       add column if not exists group_id uuid references public.groups(id) on delete cascade;
alter table public.added_films add column if not exists group_id uuid references public.groups(id) on delete cascade;

-- Your existing shelf becomes your own group, "Sid's Salon". (You are its admin.)
do $$
declare owner uuid; g uuid;
begin
  if exists (select 1 from public.lists where group_id is null) or exists (select 1 from public.added_films where group_id is null) then
    select user_id into owner from public.admins order by user_id limit 1;
    if owner is null then select id into owner from auth.users order by created_at limit 1; end if;
    insert into public.groups (name, code, created_by) values ('Sid''s Salon', public.gen_group_code(), owner) returning id into g;
    insert into public.group_members (group_id, user_id, role) values (g, owner, 'admin');
    update public.lists       set group_id = g where group_id is null;
    update public.added_films set group_id = g where group_id is null;
  end if;
end $$;

alter table public.lists       alter column group_id set not null;
alter table public.added_films alter column group_id set not null;

-- The same film can sit in several groups, so the key is (group, film).
alter table public.added_films drop constraint if exists added_films_pkey;
alter table public.added_films add primary key (group_id, id);
alter table public.lists drop constraint if exists lists_pkey;
alter table public.lists add primary key (group_id, id);

-- 6. Film policies: members of the group only ----------------------------------------------------
drop policy if exists "friends read"  on public.lists;
drop policy if exists "admin write"   on public.lists;
drop policy if exists "owner all"     on public.lists;
create policy "members read"      on public.lists for select to authenticated using (public.is_member(group_id));
create policy "group admin write" on public.lists for all    to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));

drop policy if exists "friends read"          on public.added_films;
drop policy if exists "friends add"           on public.added_films;
drop policy if exists "admin edit"            on public.added_films;
drop policy if exists "adder or admin delete" on public.added_films;
drop policy if exists "owner all"             on public.added_films;
create policy "members read" on public.added_films for select to authenticated using (public.is_member(group_id));
create policy "members add"  on public.added_films for insert to authenticated
  with check (public.is_member(group_id) and auth.uid() = user_id);
create policy "group admin edit" on public.added_films for update to authenticated
  using (public.is_group_admin(group_id)) with check (public.is_group_admin(group_id));
create policy "adder or group admin delete" on public.added_films for delete to authenticated
  using (public.is_member(group_id) and (auth.uid() = user_id or public.is_group_admin(group_id)));

-- 7. Usernames are only visible to people you share a group with --------------------------------
drop policy if exists "read all" on public.profiles;
drop policy if exists "read co-members" on public.profiles;
create policy "read co-members" on public.profiles for select to authenticated using (public.shares_group(user_id));

-- 8. What group-mates may see: username, stars, remarks, best time, feeling (per group) -------------
-- Never your email, never your private "insight" text.
drop view if exists public.public_takes;
create view public.public_takes with (security_invoker = false) as
  select gm.group_id, n.film_id, p.username, n.stars, n.remarks, n.best_time, n.feeling, n.status, n.updated
  from public.notes n
  join public.profiles p on p.user_id = n.user_id
  join public.group_members gm on gm.user_id = n.user_id
  where public.is_member(gm.group_id)
    and (n.stars > 0 or n.remarks <> '' or n.best_time <> '' or n.feeling <> '');

drop view if exists public.film_stats;
create view public.film_stats with (security_invoker = false) as
  select gm.group_id, n.film_id,
         count(*) filter (where n.status = 'watched') as seen_count,
         count(*) filter (where n.stars > 0)          as rated_count,
         round(avg(nullif(n.stars, 0))::numeric, 1)   as avg_stars
  from public.notes n join public.group_members gm on gm.user_id = n.user_id
  where public.is_member(gm.group_id)
  group by gm.group_id, n.film_id;

revoke all on public.public_takes, public.film_stats from anon;
grant select on public.public_takes, public.film_stats to authenticated;

-- 9. Sign-up is open now: groups, not a site-wide invite code, decide who sees what. ----------------
drop trigger if exists check_invite on auth.users;

-- 10. Realtime for membership changes ------------------------------------------------------------
do $$ begin
  begin alter publication supabase_realtime add table public.group_members; exception when duplicate_object then null; end;
end $$;
