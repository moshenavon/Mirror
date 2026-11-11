-- =====================================================================
-- Mirror – ALL migrations in one file (generated from supabase/migrations/)
--
-- Safe to run on:
--   * an empty database (creates everything), or
--   * a database where some or all of the migrations were already applied
--     (existing objects are kept / brought up to date, nothing is lost).
-- Runs as one transaction: if anything fails, nothing is changed.
--
-- Included, in order:
--   20261111000000_init.sql
--   20261111150000_own_auth_anonymous_public.sql
--   20261111180000_achievements.sql
--   20261111190000_action_items.sql
--   20261111200000_public_link_identity.sql
--   20261111210000_public_link_join.sql
-- =====================================================================

begin;

-- #####################################################################
-- 20261111000000_init.sql
-- #####################################################################
-- =====================================================================
-- Mirror – initial schema
-- Teams are managed by e-mail address. A signed-in user belongs to a team
-- when the (confirmed) e-mail of their auth account appears in
-- public.team_members for that team.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
do $$ begin
  create type public.team_role as enum ('admin', 'member');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.insights_visibility as enum ('admins', 'members');
exception when duplicate_object then null;
end $$;

-- Private schema for helper functions (not exposed through the Data API).
create schema if not exists private;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------
-- Generic helpers
-- ---------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (email);



-- ---------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------
create table if not exists public.teams (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (char_length(btrim(name)) between 1 and 80),
  description          text check (description is null or char_length(description) <= 500),
  insights_visibility  public.insights_visibility not null default 'admins',
  created_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create or replace trigger teams_touch_updated_at
  before update on public.teams
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------
-- team_members (membership by e-mail)
-- ---------------------------------------------------------------------
create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  email       text not null
                check (email = lower(btrim(email)))
                check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  role        public.team_role not null default 'member',
  added_by    uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  unique (team_id, email)
);
create index if not exists team_members_email_idx on public.team_members (email);

-- ---------------------------------------------------------------------
-- team_fields
-- ---------------------------------------------------------------------
create table if not exists public.team_fields (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.teams (id) on delete cascade,
  label        text not null check (char_length(btrim(label)) between 1 and 60),
  emoji        text not null default '💬' check (char_length(emoji) between 1 and 16),
  placeholder  text check (placeholder is null or char_length(placeholder) <= 200),
  position     integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, team_id)
);
create index if not exists team_fields_team_position_idx on public.team_fields (team_id, position);

create or replace trigger team_fields_touch_updated_at
  before update on public.team_fields
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------
-- entries
-- ---------------------------------------------------------------------
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references public.teams (id) on delete cascade,
  field_id    uuid not null,
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  content     text not null check (char_length(btrim(content)) between 1 and 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- the field must belong to the same team; NO ACTION so a field with entries
  -- cannot be deleted, while deleting the whole team still cascades.
  foreign key (field_id, team_id) references public.team_fields (id, team_id)
);
create index if not exists entries_team_created_idx on public.entries (team_id, created_at);
create index if not exists entries_author_idx on public.entries (author_id, created_at desc);
create index if not exists entries_field_idx on public.entries (field_id);

create or replace trigger entries_touch_updated_at
  before update on public.entries
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------
-- Authorization helpers (security definer, so they bypass RLS safely)
-- ---------------------------------------------------------------------

-- The confirmed e-mail of the calling user, lower-cased, or NULL.
create or replace function private.current_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(u.email)
  from auth.users u
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
$$;

create or replace function private.is_team_member(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id
      and m.email = private.current_email()
  )
$$;

create or replace function private.is_team_admin(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.team_members m
    where m.team_id = p_team_id
      and m.email = private.current_email()
      and m.role = 'admin'
  )
$$;

create or replace function private.can_view_insights(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_team_admin(p_team_id)
      or (
        private.is_team_member(p_team_id)
        and exists (
          select 1 from public.teams t
          where t.id = p_team_id and t.insights_visibility = 'members'
        )
      )
$$;

-- True when the calling user shares at least one team with p_email.
create or replace function private.shares_team_with(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.team_members mine
    join public.team_members theirs on theirs.team_id = mine.team_id
    where mine.email = private.current_email()
      and theirs.email = lower(p_email)
  )
$$;


-- ---------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------

-- A team must always keep at least one admin.
create or replace function private.protect_last_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role <> 'admin' then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and new.role = 'admin' then
    return new;
  end if;
  -- team itself is being deleted (cascade) – allow
  if not exists (select 1 from public.teams t where t.id = old.team_id) then
    return coalesce(new, old);
  end if;
  if not exists (
    select 1 from public.team_members m
    where m.team_id = old.team_id and m.role = 'admin' and m.id <> old.id
  ) then
    raise exception 'A team must have at least one admin' using errcode = 'P0001', hint = 'last_admin';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace trigger team_members_protect_last_admin
  before update or delete on public.team_members
  for each row execute function private.protect_last_admin();

-- Entries can only be created for / moved to active fields.
create or replace function private.check_entry_field_active()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.field_id = old.field_id then
    return new;
  end if;
  if not exists (
    select 1 from public.team_fields f
    where f.id = new.field_id and f.team_id = new.team_id and f.is_active
  ) then
    raise exception 'Field is not active' using errcode = 'P0001', hint = 'field_inactive';
  end if;
  return new;
end;
$$;

create or replace trigger entries_check_field_active
  before insert or update of field_id on public.entries
  for each row execute function private.check_entry_field_active();

-- ---------------------------------------------------------------------
-- Privileges (column level) + Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.teams        enable row level security;
alter table public.team_members enable row level security;
alter table public.team_fields  enable row level security;
alter table public.entries      enable row level security;

revoke all on public.profiles, public.teams, public.team_members, public.team_fields, public.entries
  from anon, authenticated;

grant select on public.profiles to authenticated;

grant select, delete on public.teams to authenticated;
grant update (name, description, insights_visibility) on public.teams to authenticated;

grant select, delete on public.team_members to authenticated;
grant insert (team_id, email, role) on public.team_members to authenticated;
grant update (role) on public.team_members to authenticated;

grant select, delete on public.team_fields to authenticated;
grant insert (team_id, label, emoji, placeholder, position, is_active) on public.team_fields to authenticated;
grant update (label, emoji, placeholder, position, is_active) on public.team_fields to authenticated;

grant select, delete on public.entries to authenticated;
grant insert (team_id, field_id, content) on public.entries to authenticated;
grant update (field_id, content) on public.entries to authenticated;

-- profiles
drop policy if exists "profiles: read self or teammates" on public.profiles;
create policy "profiles: read self or teammates"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_team_with(email));

-- teams
drop policy if exists "teams: members read" on public.teams;
create policy "teams: members read"
  on public.teams for select to authenticated
  using (private.is_team_member(id));
drop policy if exists "teams: admins update" on public.teams;
create policy "teams: admins update"
  on public.teams for update to authenticated
  using (private.is_team_admin(id))
  with check (private.is_team_admin(id));
drop policy if exists "teams: admins delete" on public.teams;
create policy "teams: admins delete"
  on public.teams for delete to authenticated
  using (private.is_team_admin(id));

-- team_members
drop policy if exists "team_members: members read" on public.team_members;
create policy "team_members: members read"
  on public.team_members for select to authenticated
  using (private.is_team_member(team_id));
drop policy if exists "team_members: admins insert" on public.team_members;
create policy "team_members: admins insert"
  on public.team_members for insert to authenticated
  with check (private.is_team_admin(team_id));
drop policy if exists "team_members: admins update" on public.team_members;
create policy "team_members: admins update"
  on public.team_members for update to authenticated
  using (private.is_team_admin(team_id))
  with check (private.is_team_admin(team_id));
drop policy if exists "team_members: admins delete" on public.team_members;
create policy "team_members: admins delete"
  on public.team_members for delete to authenticated
  using (private.is_team_admin(team_id));

-- team_fields
drop policy if exists "team_fields: members read" on public.team_fields;
create policy "team_fields: members read"
  on public.team_fields for select to authenticated
  using (private.is_team_member(team_id));
drop policy if exists "team_fields: admins insert" on public.team_fields;
create policy "team_fields: admins insert"
  on public.team_fields for insert to authenticated
  with check (private.is_team_admin(team_id));
drop policy if exists "team_fields: admins update" on public.team_fields;
create policy "team_fields: admins update"
  on public.team_fields for update to authenticated
  using (private.is_team_admin(team_id))
  with check (private.is_team_admin(team_id));
drop policy if exists "team_fields: admins delete" on public.team_fields;
create policy "team_fields: admins delete"
  on public.team_fields for delete to authenticated
  using (private.is_team_admin(team_id));

-- entries
drop policy if exists "entries: author or insights viewers read" on public.entries;
create policy "entries: author or insights viewers read"
  on public.entries for select to authenticated
  using (author_id = (select auth.uid()) or private.can_view_insights(team_id));
drop policy if exists "entries: members insert own" on public.entries;
create policy "entries: members insert own"
  on public.entries for insert to authenticated
  with check (author_id = (select auth.uid()) and private.is_team_member(team_id));
drop policy if exists "entries: author updates own" on public.entries;
create policy "entries: author updates own"
  on public.entries for update to authenticated
  using (author_id = (select auth.uid()) and private.is_team_member(team_id))
  with check (author_id = (select auth.uid()) and private.is_team_member(team_id));
drop policy if exists "entries: author deletes own" on public.entries;
create policy "entries: author deletes own"
  on public.entries for delete to authenticated
  using (author_id = (select auth.uid()) and private.is_team_member(team_id));

-- ---------------------------------------------------------------------
-- RPC
-- ---------------------------------------------------------------------

-- Create a team; the caller becomes its first admin; default fields are added.
create or replace function public.create_team(p_name text, p_description text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := private.current_email();
  v_team  uuid;
begin
  if v_uid is null or v_email is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  -- make sure a profile row exists (normally created by the auth trigger)
  insert into public.profiles (id, email, full_name, avatar_url)
  select u.id, lower(u.email),
         coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
         coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
  from auth.users u where u.id = v_uid
  on conflict (id) do nothing;

  insert into public.teams (name, description, created_by)
  values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), v_uid)
  returning id into v_team;

  insert into public.team_members (team_id, email, role, added_by)
  values (v_team, v_email, 'admin', v_uid);

  insert into public.team_fields (team_id, label, emoji, placeholder, position) values
    (v_team, 'ממה אני שמח',            '😄', 'מה עשה לי טוב לאחרונה?',                 1),
    (v_team, 'ממה הייתי עצוב',          '😢', 'מה הציק לי או העציב אותי?',              2),
    (v_team, 'מה למדתי',               '💡', 'תובנה או לקח מיוחד',                     3),
    (v_team, 'דבר שצריך להימנע ממנו',   '⚠️', 'משהו גרוע שקורה בצוות ושכדאי לעצור',      4);

  return v_team;
end;
$$;

-- Set the order of a team's fields. p_field_ids must list every field of the team exactly once.
create or replace function public.reorder_fields(p_team_id uuid, p_field_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_team_admin(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  if (select count(distinct x) from unnest(p_field_ids) as x) <> coalesce(array_length(p_field_ids, 1), 0)
     or (select count(*) from public.team_fields f where f.team_id = p_team_id) <> coalesce(array_length(p_field_ids, 1), 0)
     or exists (
       select 1 from unnest(p_field_ids) as x
       where not exists (select 1 from public.team_fields f where f.id = x and f.team_id = p_team_id)
     )
  then
    raise exception 'Field list does not match the team fields' using errcode = '22023';
  end if;

  update public.team_fields f
     set position = o.ord
    from unnest(p_field_ids) with ordinality as o(id, ord)
   where f.id = o.id and f.team_id = p_team_id;
end;
$$;

-- Teams of the calling user with their role and insights permission.
drop function if exists public.my_teams();
create function public.my_teams()
returns table (
  id                  uuid,
  name                text,
  description         text,
  insights_visibility public.insights_visibility,
  role                public.team_role,
  can_view_insights   boolean,
  created_at          timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, t.description, t.insights_visibility, m.role,
         (m.role = 'admin' or t.insights_visibility = 'members') as can_view_insights,
         t.created_at
  from public.team_members m
  join public.teams t on t.id = m.team_id
  where m.email = private.current_email()
  order by t.name
$$;

-- Entries of a team inside [p_from, p_to), with author name & picture,
-- ordered by field position and then by creation time.
drop function if exists public.get_insights(uuid, timestamptz, timestamptz);
create function public.get_insights(p_team_id uuid, p_from timestamptz, p_to timestamptz)
returns table (
  entry_id          uuid,
  field_id          uuid,
  content           text,
  created_at        timestamptz,
  updated_at        timestamptz,
  author_id         uuid,
  author_name       text,
  author_email      text,
  author_avatar_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_view_insights(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
    select e.id, e.field_id, e.content, e.created_at, e.updated_at,
           p.id, p.full_name, p.email, p.avatar_url
    from public.entries e
    join public.team_fields f on f.id = e.field_id
    join public.profiles p on p.id = e.author_id
    where e.team_id = p_team_id
      and e.created_at >= p_from
      and e.created_at < p_to
    order by f.position, e.created_at, e.id;
end;
$$;

revoke all on function public.create_team(text, text) from public, anon;
revoke all on function public.reorder_fields(uuid, uuid[]) from public, anon;
revoke all on function public.my_teams() from public, anon;
revoke all on function public.get_insights(uuid, timestamptz, timestamptz) from public, anon;
grant execute on function public.create_team(text, text) to authenticated;
grant execute on function public.reorder_fields(uuid, uuid[]) to authenticated;
grant execute on function public.my_teams() to authenticated;
grant execute on function public.get_insights(uuid, timestamptz, timestamptz) to authenticated;

-- helper functions in the private schema are only callable by signed-in users
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- #####################################################################
-- 20261111150000_own_auth_anonymous_public.sql
-- #####################################################################
-- =====================================================================
-- Phase 2
--  1. Authentication moves from Supabase Auth to our own Google OAuth.
--     The app server verifies Google ID tokens, upserts public.profiles
--     (with the service role) and signs short-lived JWTs (sub = profile id)
--     that PostgREST verifies, so auth.uid() keeps driving RLS.
--  2. Anonymous entries: author_id is NULL – no link to the sender at all.
--     Only the calendar date is kept (no exact time).
--  3. Public link: anyone holding /r/<token> may submit (always anonymous)
--     when an admin enabled it.
-- =====================================================================

-- ---------- 1. profiles become our own user table ----------
drop trigger if exists on_auth_user_changed on auth.users;
drop function if exists private.sync_profile_from_auth();

alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.profiles alter column id set default gen_random_uuid();
alter table public.profiles add column if not exists google_sub text;
update public.profiles set google_sub = 'legacy:' || id where google_sub is null;
alter table public.profiles alter column google_sub set not null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_google_sub_key' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_google_sub_key unique (google_sub);
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_email_lower' and conrelid = 'public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_email_lower check (email = lower(email));
  end if;
end $$;

create or replace trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

-- E-mail of the calling user. Profiles are written only by the server after
-- verifying a Google ID token with email_verified = true.
create or replace function private.current_email()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.email from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.create_team(p_name text, p_description text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := private.current_email();
  v_team  uuid;
begin
  if v_uid is null or v_email is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  insert into public.teams (name, description, created_by)
  values (btrim(p_name), nullif(btrim(coalesce(p_description, '')), ''), v_uid)
  returning id into v_team;

  insert into public.team_members (team_id, email, role, added_by)
  values (v_team, v_email, 'admin', v_uid);

  insert into public.team_fields (team_id, label, emoji, placeholder, position) values
    (v_team, 'ממה אני שמח',            '😄', 'מה עשה לי טוב לאחרונה?',                 1),
    (v_team, 'ממה הייתי עצוב',          '😢', 'מה הציק לי או העציב אותי?',              2),
    (v_team, 'מה למדתי',               '💡', 'תובנה או לקח מיוחד',                     3),
    (v_team, 'דבר שצריך להימנע ממנו',   '⚠️', 'משהו גרוע שקורה בצוות ושכדאי לעצור',      4);

  return v_team;
end;
$$;

-- ---------- 2. anonymous entries ----------
alter table public.entries alter column author_id drop not null;

-- Local midnight of "today" – anonymous entries keep the date only.
create or replace function private.today_start()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (date_trunc('day', now() at time zone 'Asia/Jerusalem')) at time zone 'Asia/Jerusalem'
$$;

create or replace function private.insert_anonymous_entry(p_team_id uuid, p_field_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day timestamptz := private.today_start();
begin
  insert into public.entries (team_id, field_id, author_id, content, created_at, updated_at)
  values (p_team_id, p_field_id, null, btrim(coalesce(p_content, '')), v_day, v_day);
end;
$$;

-- Signed-in member sends an anonymous entry. Returns nothing on purpose.
create or replace function public.submit_anonymous_entry(p_team_id uuid, p_field_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_team_member(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  perform private.insert_anonymous_entry(p_team_id, p_field_id, p_content);
end;
$$;

-- ---------- 3. public link ----------
create or replace function private.new_public_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$$;

alter table public.teams
  add column if not exists public_submissions_enabled boolean not null default false,
  add column if not exists public_token text not null default private.new_public_token();
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'teams_public_token_key' and conrelid = 'public.teams'::regclass) then
    alter table public.teams add constraint teams_public_token_key unique (public_token);
  end if;
end $$;

-- the token is only exposed to admins (through my_teams)
revoke select on public.teams from authenticated;
grant select (id, name, description, insights_visibility, public_submissions_enabled, created_by, created_at, updated_at)
  on public.teams to authenticated;
grant update (public_submissions_enabled) on public.teams to authenticated;

create or replace function public.regenerate_public_token(p_team_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := private.new_public_token();
begin
  if not private.is_team_admin(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  update public.teams set public_token = v_token where id = p_team_id;
  return v_token;
end;
$$;

-- Public form definition (team name + active fields) for an enabled link, or NULL.
create or replace function public.get_public_form(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'team_name', t.name,
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'label', f.label, 'emoji', f.emoji,
               'placeholder', f.placeholder, 'position', f.position)
             order by f.position, f.created_at)
      from public.team_fields f
      where f.team_id = t.id and f.is_active
    ), '[]'::jsonb)
  )
  from public.teams t
  where t.public_token = p_token
    and t.public_submissions_enabled
    and length(p_token) >= 32
$$;

create or replace function public.submit_public_entry(p_token text, p_field_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
begin
  select t.id into v_team
  from public.teams t
  where t.public_token = p_token and t.public_submissions_enabled and length(p_token) >= 32;

  if v_team is null then
    raise exception 'Public link is disabled' using errcode = 'P0001', hint = 'link_disabled';
  end if;
  perform private.insert_anonymous_entry(v_team, p_field_id, p_content);
end;
$$;

-- ---------- RPC changes ----------
drop function if exists public.my_teams();
create function public.my_teams()
returns table (
  id                          uuid,
  name                        text,
  description                 text,
  insights_visibility         public.insights_visibility,
  role                        public.team_role,
  can_view_insights           boolean,
  public_submissions_enabled  boolean,
  public_token                text,
  created_at                  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, t.description, t.insights_visibility, m.role,
         (m.role = 'admin' or t.insights_visibility = 'members') as can_view_insights,
         t.public_submissions_enabled,
         case when m.role = 'admin' then t.public_token end as public_token,
         t.created_at
  from public.team_members m
  join public.teams t on t.id = m.team_id
  where m.email = private.current_email()
  order by t.name
$$;

drop function if exists public.get_insights(uuid, timestamptz, timestamptz);
create function public.get_insights(p_team_id uuid, p_from timestamptz, p_to timestamptz)
returns table (
  entry_id          uuid,
  field_id          uuid,
  content           text,
  created_at        timestamptz,
  updated_at        timestamptz,
  is_anonymous      boolean,
  author_id         uuid,
  author_name       text,
  author_email      text,
  author_avatar_url text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.can_view_insights(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
    select e.id, e.field_id, e.content, e.created_at, e.updated_at,
           e.author_id is null,
           p.id, p.full_name, p.email, p.avatar_url
    from public.entries e
    join public.team_fields f on f.id = e.field_id
    left join public.profiles p on p.id = e.author_id
    where e.team_id = p_team_id
      and e.created_at >= p_from
      and e.created_at < p_to
    order by f.position, e.created_at, e.id;
end;
$$;

-- ---------- grants ----------
revoke all on function public.create_team(text, text) from public, anon;
revoke all on function public.my_teams() from public, anon;
revoke all on function public.get_insights(uuid, timestamptz, timestamptz) from public, anon;
revoke all on function public.submit_anonymous_entry(uuid, uuid, text) from public, anon;
revoke all on function public.regenerate_public_token(uuid) from public, anon;
revoke all on function public.get_public_form(text) from public;
revoke all on function public.submit_public_entry(text, uuid, text) from public;

grant execute on function public.create_team(text, text) to authenticated;
grant execute on function public.my_teams() to authenticated;
grant execute on function public.get_insights(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.submit_anonymous_entry(uuid, uuid, text) to authenticated;
grant execute on function public.regenerate_public_token(uuid) to authenticated;
grant execute on function public.get_public_form(text) to anon, authenticated;
grant execute on function public.submit_public_entry(text, uuid, text) to anon, authenticated;

revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- #####################################################################
-- 20261111180000_achievements.sql
-- #####################################################################
-- =====================================================================
-- Achievements map
-- Every team member sees how many entries each teammate has sent, so the
-- achievements screen can place everyone on the levels map.
--  * Only counts are exposed – never content – so this works even when
--    the insights screen is limited to admins.
--  * Anonymous entries have no author and are therefore never counted.
--  * Members that never signed in are listed with a count of 0.
-- =====================================================================

create or replace function public.get_achievements(p_team_id uuid)
returns table (
  member_email  text,
  full_name     text,
  avatar_url    text,
  entry_count   integer,
  is_me         boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me text := private.current_email();
begin
  if not private.is_team_member(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
    select m.email,
           p.full_name,
           p.avatar_url,
           coalesce((
             select count(*)::integer
             from public.entries e
             where e.team_id = p_team_id and e.author_id = p.id
           ), 0),
           m.email = v_me
    from public.team_members m
    left join lateral (
      select pr.id, pr.full_name, pr.avatar_url
      from public.profiles pr
      where pr.email = m.email
      order by pr.updated_at desc
      limit 1
    ) p on true
    where m.team_id = p_team_id
    order by 4 desc, m.email;
end;
$$;

revoke all on function public.get_achievements(uuid) from public, anon;
grant execute on function public.get_achievements(uuid) to authenticated;

-- #####################################################################
-- 20261111190000_action_items.sql
-- #####################################################################
-- =====================================================================
-- Phase 3 – Action items
--  * Created from an insight (an entry) while presenting the retro, by
--    anyone allowed to view insights.
--  * Every team member sees the team's action items and may mark them
--    done / not done. The source insight (field + content snapshot) is
--    only returned to insights viewers.
--  * The creator or a team admin may delete an action item.
--  * All access goes through security-definer RPCs; the table itself is
--    not readable or writable through the Data API.
-- =====================================================================

create table if not exists public.action_items (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams (id) on delete cascade,
  -- the insight this task came from; kept as a snapshot when the entry is deleted
  entry_id        uuid references public.entries (id) on delete set null,
  field_id        uuid references public.team_fields (id) on delete set null,
  source_content  text check (source_content is null or char_length(source_content) <= 2000),
  title           text not null check (char_length(btrim(title)) between 1 and 300),
  created_by      uuid references public.profiles (id) on delete set null,
  done_at         timestamptz,
  done_by         uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists action_items_team_idx on public.action_items (team_id, created_at);
create index if not exists action_items_entry_idx on public.action_items (entry_id);

create or replace trigger action_items_touch_updated_at
  before update on public.action_items
  for each row execute function private.touch_updated_at();

alter table public.action_items enable row level security;
revoke all on public.action_items from anon, authenticated;
-- no policies: only the functions below (security definer) touch the table

-- ---------- create (insights viewers) ----------
create or replace function public.create_action_item(p_team_id uuid, p_entry_id uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_entry public.entries%rowtype;
  v_id    uuid;
begin
  if not private.can_view_insights(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  select * into v_entry from public.entries e where e.id = p_entry_id and e.team_id = p_team_id;
  if not found then
    raise exception 'Entry not found' using errcode = 'P0001', hint = 'entry_not_found';
  end if;

  insert into public.action_items (team_id, entry_id, field_id, source_content, title, created_by)
  values (p_team_id, v_entry.id, v_entry.field_id, v_entry.content, btrim(coalesce(p_title, '')), auth.uid())
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- mark done / not done (team members) ----------
create or replace function public.set_action_item_done(p_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team uuid;
begin
  select a.team_id into v_team from public.action_items a where a.id = p_id;
  if v_team is null or not private.is_team_member(v_team) then
    raise exception 'Action item not found' using errcode = 'P0001', hint = 'action_item_not_found';
  end if;

  update public.action_items a
     set done_at = case when p_done then coalesce(a.done_at, now()) end,
         done_by = case when p_done then coalesce(a.done_by, auth.uid()) end
   where a.id = p_id;
end;
$$;

-- ---------- delete (creator or admin) ----------
create or replace function public.delete_action_item(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.action_items%rowtype;
begin
  select * into v_item from public.action_items a where a.id = p_id;
  if not found or not private.is_team_member(v_item.team_id) then
    raise exception 'Action item not found' using errcode = 'P0001', hint = 'action_item_not_found';
  end if;
  if v_item.created_by is distinct from auth.uid() and not private.is_team_admin(v_item.team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  delete from public.action_items a where a.id = p_id;
end;
$$;

-- ---------- read (team members) ----------
-- Open items first (newest first), then done items in the order they were done,
-- so the most recently completed one sits at the very bottom.
create or replace function public.get_action_items(p_team_id uuid)
returns table (
  id               uuid,
  title            text,
  entry_id         uuid,
  field_id         uuid,
  field_label      text,
  field_emoji      text,
  source_content   text,
  created_at       timestamptz,
  created_by_name  text,
  done_at          timestamptz,
  done_by_name     text,
  can_delete       boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_insights boolean := private.can_view_insights(p_team_id);
  v_admin    boolean := private.is_team_admin(p_team_id);
begin
  if not private.is_team_member(p_team_id) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;

  return query
    select a.id, a.title,
           case when v_insights then a.entry_id end,
           case when v_insights then a.field_id end,
           case when v_insights then f.label end,
           case when v_insights then f.emoji end,
           case when v_insights then a.source_content end,
           a.created_at,
           coalesce(c.full_name, c.email),
           a.done_at,
           coalesce(d.full_name, d.email),
           (v_admin or a.created_by = auth.uid())
    from public.action_items a
    left join public.team_fields f on f.id = a.field_id
    left join public.profiles c on c.id = a.created_by
    left join public.profiles d on d.id = a.done_by
    where a.team_id = p_team_id
    order by (a.done_at is not null), a.done_at asc nulls first, a.created_at desc, a.id;
end;
$$;

-- ---------- grants ----------
revoke all on function public.create_action_item(uuid, uuid, text) from public, anon;
revoke all on function public.set_action_item_done(uuid, boolean) from public, anon;
revoke all on function public.delete_action_item(uuid) from public, anon;
revoke all on function public.get_action_items(uuid) from public, anon;

grant execute on function public.create_action_item(uuid, uuid, text) to authenticated;
grant execute on function public.set_action_item_done(uuid, boolean) to authenticated;
grant execute on function public.delete_action_item(uuid) to authenticated;
grant execute on function public.get_action_items(uuid) to authenticated;

-- #####################################################################
-- 20261111200000_public_link_identity.sql
-- #####################################################################
-- =====================================================================
-- Public link: optional "identified" mode
-- An admin can keep the public link open to everyone (anonymous, as
-- before) or require the sender to sign in with Google. In identified
-- mode the entry is stored with the sender as its author – even when the
-- sender is not a member of the team – so it shows up with name and
-- picture on the insights screen.
-- =====================================================================

alter table public.teams
  add column if not exists public_requires_identity boolean not null default false;

grant select (public_requires_identity) on public.teams to authenticated;
grant update (public_requires_identity) on public.teams to authenticated;

-- Public form definition (team name + mode + active fields) for an enabled link, or NULL.
create or replace function public.get_public_form(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'team_name', t.name,
    'requires_identity', t.public_requires_identity,
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'label', f.label, 'emoji', f.emoji,
               'placeholder', f.placeholder, 'position', f.position)
             order by f.position, f.created_at)
      from public.team_fields f
      where f.team_id = t.id and f.is_active
    ), '[]'::jsonb)
  )
  from public.teams t
  where t.public_token = p_token
    and t.public_submissions_enabled
    and length(p_token) >= 32
$$;

-- Anonymous link  -> stored without an author (as before).
-- Identified link -> the caller must be signed in; stored with them as the author.
create or replace function public.submit_public_entry(p_token text, p_field_id uuid, p_content text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team     uuid;
  v_identity boolean;
  v_uid      uuid := auth.uid();
begin
  select t.id, t.public_requires_identity into v_team, v_identity
  from public.teams t
  where t.public_token = p_token and t.public_submissions_enabled and length(p_token) >= 32;

  if v_team is null then
    raise exception 'Public link is disabled' using errcode = 'P0001', hint = 'link_disabled';
  end if;

  if not v_identity then
    perform private.insert_anonymous_entry(v_team, p_field_id, p_content);
    return;
  end if;

  if v_uid is null or private.current_email() is null then
    raise exception 'Sign-in required' using errcode = '28000', hint = 'identity_required';
  end if;

  insert into public.entries (team_id, field_id, author_id, content)
  values (v_team, p_field_id, v_uid, btrim(coalesce(p_content, '')));
end;
$$;

drop function if exists public.my_teams();
create function public.my_teams()
returns table (
  id                          uuid,
  name                        text,
  description                 text,
  insights_visibility         public.insights_visibility,
  role                        public.team_role,
  can_view_insights           boolean,
  public_submissions_enabled  boolean,
  public_requires_identity    boolean,
  public_token                text,
  created_at                  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, t.description, t.insights_visibility, m.role,
         (m.role = 'admin' or t.insights_visibility = 'members') as can_view_insights,
         t.public_submissions_enabled,
         t.public_requires_identity,
         case when m.role = 'admin' then t.public_token end as public_token,
         t.created_at
  from public.team_members m
  join public.teams t on t.id = m.team_id
  where m.email = private.current_email()
  order by t.name
$$;

revoke all on function public.my_teams() from public, anon;
grant execute on function public.my_teams() to authenticated;

revoke all on function public.get_public_form(text) from public;
revoke all on function public.submit_public_entry(text, uuid, text) from public;
grant execute on function public.get_public_form(text) to anon, authenticated;
grant execute on function public.submit_public_entry(text, uuid, text) to anon, authenticated;

-- #####################################################################
-- 20261111210000_public_link_join.sql
-- #####################################################################
-- =====================================================================
-- Public link: joining the team
-- An admin can let people who hold the public link join the team. The
-- visitor signs in with Google and chooses to join; they are added to
-- team_members as a regular 'member' – exactly like a member an admin
-- added from the settings screen. Works with both link modes
-- (anonymous / identified) and only while the link itself is enabled.
-- =====================================================================

alter table public.teams
  add column if not exists public_allow_join boolean not null default false;

grant select (public_allow_join) on public.teams to authenticated;
grant update (public_allow_join) on public.teams to authenticated;

-- Public form definition for an enabled link, or NULL.
-- member_team_id is set only when the caller is already a member.
create or replace function public.get_public_form(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'team_name', t.name,
    'requires_identity', t.public_requires_identity,
    'allow_join', t.public_allow_join,
    'member_team_id', case when private.is_team_member(t.id) then t.id end,
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'label', f.label, 'emoji', f.emoji,
               'placeholder', f.placeholder, 'position', f.position)
             order by f.position, f.created_at)
      from public.team_fields f
      where f.team_id = t.id and f.is_active
    ), '[]'::jsonb)
  )
  from public.teams t
  where t.public_token = p_token
    and t.public_submissions_enabled
    and length(p_token) >= 32
$$;

-- The signed-in caller joins the team of an enabled public link that allows
-- joining. Idempotent: an existing membership (any role) is kept as is.
create or replace function public.join_team_via_link(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := auth.uid();
  v_email text := private.current_email();
  v_team  uuid;
  v_join  boolean;
begin
  if v_uid is null or v_email is null then
    raise exception 'Sign-in required' using errcode = '28000', hint = 'identity_required';
  end if;

  select t.id, t.public_allow_join into v_team, v_join
  from public.teams t
  where t.public_token = p_token and t.public_submissions_enabled and length(p_token) >= 32;

  if v_team is null then
    raise exception 'Public link is disabled' using errcode = 'P0001', hint = 'link_disabled';
  end if;
  if not v_join then
    raise exception 'Joining through this link is disabled' using errcode = 'P0001', hint = 'join_disabled';
  end if;

  insert into public.team_members (team_id, email, role, added_by)
  values (v_team, v_email, 'member', v_uid)
  on conflict (team_id, email) do nothing;

  return v_team;
end;
$$;

drop function if exists public.my_teams();
create function public.my_teams()
returns table (
  id                          uuid,
  name                        text,
  description                 text,
  insights_visibility         public.insights_visibility,
  role                        public.team_role,
  can_view_insights           boolean,
  public_submissions_enabled  boolean,
  public_requires_identity    boolean,
  public_allow_join           boolean,
  public_token                text,
  created_at                  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select t.id, t.name, t.description, t.insights_visibility, m.role,
         (m.role = 'admin' or t.insights_visibility = 'members') as can_view_insights,
         t.public_submissions_enabled,
         t.public_requires_identity,
         t.public_allow_join,
         case when m.role = 'admin' then t.public_token end as public_token,
         t.created_at
  from public.team_members m
  join public.teams t on t.id = m.team_id
  where m.email = private.current_email()
  order by t.name
$$;

revoke all on function public.my_teams() from public, anon;
grant execute on function public.my_teams() to authenticated;

revoke all on function public.get_public_form(text) from public;
grant execute on function public.get_public_form(text) to anon, authenticated;

revoke all on function public.join_team_via_link(text) from public, anon;
grant execute on function public.join_team_via_link(text) to authenticated;

commit;
