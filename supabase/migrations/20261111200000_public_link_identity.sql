-- =====================================================================
-- Public link: optional "identified" mode
-- An admin can keep the public link open to everyone (anonymous, as
-- before) or require the sender to sign in with Google. In identified
-- mode the entry is stored with the sender as its author – even when the
-- sender is not a member of the team – so it shows up with name and
-- picture on the insights screen.
-- =====================================================================

alter table public.teams
  add column public_requires_identity boolean not null default false;

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
