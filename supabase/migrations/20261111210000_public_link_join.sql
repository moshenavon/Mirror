-- =====================================================================
-- Public link: joining the team
-- An admin can let people who hold the public link join the team. The
-- visitor signs in with Google and chooses to join; they are added to
-- team_members as a regular 'member' – exactly like a member an admin
-- added from the settings screen. Works with both link modes
-- (anonymous / identified) and only while the link itself is enabled.
-- =====================================================================

alter table public.teams
  add column public_allow_join boolean not null default false;

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
