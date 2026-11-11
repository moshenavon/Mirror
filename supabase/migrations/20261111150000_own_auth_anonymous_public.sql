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
alter table public.profiles add column google_sub text;
update public.profiles set google_sub = 'legacy:' || id where google_sub is null;
alter table public.profiles alter column google_sub set not null;
alter table public.profiles add constraint profiles_google_sub_key unique (google_sub);
alter table public.profiles add constraint profiles_email_lower check (email = lower(email));

create trigger profiles_touch_updated_at
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
  add column public_submissions_enabled boolean not null default false,
  add column public_token text not null default private.new_public_token();
alter table public.teams add constraint teams_public_token_key unique (public_token);

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
