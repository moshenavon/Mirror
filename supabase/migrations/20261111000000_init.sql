-- =====================================================================
-- Mirror – initial schema
-- Teams are managed by e-mail address. A signed-in user belongs to a team
-- when the (confirmed) e-mail of their auth account appears in
-- public.team_members for that team.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.team_role as enum ('admin', 'member');
create type public.insights_visibility as enum ('admins', 'members');

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
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index profiles_email_idx on public.profiles (email);

create or replace function private.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(excluded.full_name, public.profiles.full_name),
        avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
        updated_at = now();
  return new;
end;
$$;

create trigger on_auth_user_changed
  after insert or update of email, raw_user_meta_data on auth.users
  for each row execute function private.sync_profile_from_auth();

-- ---------------------------------------------------------------------
-- teams
-- ---------------------------------------------------------------------
create table public.teams (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null check (char_length(btrim(name)) between 1 and 80),
  description          text check (description is null or char_length(description) <= 500),
  insights_visibility  public.insights_visibility not null default 'admins',
  created_by           uuid references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger teams_touch_updated_at
  before update on public.teams
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------
-- team_members (membership by e-mail)
-- ---------------------------------------------------------------------
create table public.team_members (
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
create index team_members_email_idx on public.team_members (email);

-- ---------------------------------------------------------------------
-- team_fields
-- ---------------------------------------------------------------------
create table public.team_fields (
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
create index team_fields_team_position_idx on public.team_fields (team_id, position);

create trigger team_fields_touch_updated_at
  before update on public.team_fields
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------
-- entries
-- ---------------------------------------------------------------------
create table public.entries (
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
create index entries_team_created_idx on public.entries (team_id, created_at);
create index entries_author_idx on public.entries (author_id, created_at desc);
create index entries_field_idx on public.entries (field_id);

create trigger entries_touch_updated_at
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

create trigger team_members_protect_last_admin
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

create trigger entries_check_field_active
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
create policy "profiles: read self or teammates"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or private.shares_team_with(email));

-- teams
create policy "teams: members read"
  on public.teams for select to authenticated
  using (private.is_team_member(id));
create policy "teams: admins update"
  on public.teams for update to authenticated
  using (private.is_team_admin(id))
  with check (private.is_team_admin(id));
create policy "teams: admins delete"
  on public.teams for delete to authenticated
  using (private.is_team_admin(id));

-- team_members
create policy "team_members: members read"
  on public.team_members for select to authenticated
  using (private.is_team_member(team_id));
create policy "team_members: admins insert"
  on public.team_members for insert to authenticated
  with check (private.is_team_admin(team_id));
create policy "team_members: admins update"
  on public.team_members for update to authenticated
  using (private.is_team_admin(team_id))
  with check (private.is_team_admin(team_id));
create policy "team_members: admins delete"
  on public.team_members for delete to authenticated
  using (private.is_team_admin(team_id));

-- team_fields
create policy "team_fields: members read"
  on public.team_fields for select to authenticated
  using (private.is_team_member(team_id));
create policy "team_fields: admins insert"
  on public.team_fields for insert to authenticated
  with check (private.is_team_admin(team_id));
create policy "team_fields: admins update"
  on public.team_fields for update to authenticated
  using (private.is_team_admin(team_id))
  with check (private.is_team_admin(team_id));
create policy "team_fields: admins delete"
  on public.team_fields for delete to authenticated
  using (private.is_team_admin(team_id));

-- entries
create policy "entries: author or insights viewers read"
  on public.entries for select to authenticated
  using (author_id = (select auth.uid()) or private.can_view_insights(team_id));
create policy "entries: members insert own"
  on public.entries for insert to authenticated
  with check (author_id = (select auth.uid()) and private.is_team_member(team_id));
create policy "entries: author updates own"
  on public.entries for update to authenticated
  using (author_id = (select auth.uid()) and private.is_team_member(team_id))
  with check (author_id = (select auth.uid()) and private.is_team_member(team_id));
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
create or replace function public.my_teams()
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
create or replace function public.get_insights(p_team_id uuid, p_from timestamptz, p_to timestamptz)
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
